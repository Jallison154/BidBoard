import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  RemoteMode,
  ServerStatus,
  ServerToClientEvents,
  SubmissionResult,
} from '../src/shared/socketTypes';
import { ServerState, decideSubmissionOutcome } from './state';
import { RateLimiter } from './rateLimiter';
import { getLocalIPv4Addresses } from './network';
import { generateQrDataUrl } from './qr';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface SocketData {
  role?: 'operator' | 'remote';
  deviceId?: string;
}

const PIN_ATTEMPT_LIMIT = 5;
const PIN_ATTEMPT_WINDOW_MS = 60_000;
const LOOKUP_TIMEOUT_MS = 8_000;

interface PendingLookup {
  remoteId: string;
  bidderNumber: string;
  timeoutHandle: ReturnType<typeof setTimeout>;
}

export interface AttachOptions {
  port: number;
}

export function attachSocketServer(io: IOServer, options: AttachOptions) {
  const state = new ServerState();
  const pinLimiter = new RateLimiter(PIN_ATTEMPT_LIMIT, PIN_ATTEMPT_WINDOW_MS);
  const pendingLookups = new Map<string, PendingLookup>();
  const resultCache = new Map<string, SubmissionResult>();

  async function buildStatus(): Promise<ServerStatus> {
    const localIps = getLocalIPv4Addresses();
    const primaryIp = localIps[0] ?? null;
    const remoteUrl = primaryIp ? `http://${primaryIp}:${options.port}/remote?token=${state.qrToken}` : null;
    const qrDataUrl = remoteUrl ? await generateQrDataUrl(remoteUrl) : null;
    return {
      remoteAccessEnabled: state.remoteAccessEnabled,
      acceptingNewConnections: state.acceptingNewConnections,
      pin: state.pin,
      port: options.port,
      localIps,
      remoteUrl,
      qrDataUrl,
      remoteMode: state.remoteMode,
      allowRemoteClear: state.allowRemoteClear,
      eventName: state.eventName,
      remotes: state.remotesList(),
      pendingRequests: state.pendingRequestsList(),
      operatorConnected: state.operatorSocketId !== null,
    };
  }

  async function pushStatusToOperator() {
    if (!state.operatorSocketId) return;
    const status = await buildStatus();
    io.to(state.operatorSocketId).emit('server:status', status);
  }

  function findRemoteSocket(remoteId: string): IOSocket | undefined {
    const record = state.remotes.get(remoteId);
    if (!record?.socketId) return undefined;
    const socket = io.sockets.sockets.get(record.socketId);
    return socket as IOSocket | undefined;
  }

  function sendSubmissionResult(remoteId: string, result: SubmissionResult) {
    resultCache.set(result.requestId, result);
    const socket = findRemoteSocket(remoteId);
    socket?.emit('remote:submissionResult', result);
  }

  io.on('connection', (socket: IOSocket) => {
    const data = socket.data as SocketData;

    socket.on('operator:hello', () => {
      data.role = 'operator';
      state.operatorSocketId = socket.id;
      // Every open operator console joins this room. A clear has to reach all
      // of them: the display channel is shared, and a single stored socket id
      // can point at a tab that is no longer the one driving the screen.
      socket.join('operators');
      void pushStatusToOperator();
    });

    socket.on('operator:updateSettings', (payload) => {
      if (data.role !== 'operator') return;
      if (payload.remoteAccessEnabled !== undefined) state.remoteAccessEnabled = payload.remoteAccessEnabled;
      if (payload.acceptingNewConnections !== undefined) state.acceptingNewConnections = payload.acceptingNewConnections;
      if (payload.remoteMode !== undefined) state.remoteMode = payload.remoteMode as RemoteMode;
      if (payload.allowRemoteClear !== undefined) state.allowRemoteClear = payload.allowRemoteClear;
      if (payload.eventName !== undefined) state.eventName = payload.eventName;
      if (payload.joinToken !== undefined) state.setEventJoinToken(payload.joinToken);
      void pushStatusToOperator();
    });

    socket.on('operator:regeneratePin', () => {
      if (data.role !== 'operator') return;
      state.regeneratePin();
      void pushStatusToOperator();
    });

    socket.on('operator:disconnectRemote', ({ remoteId }) => {
      if (data.role !== 'operator') return;
      const record = state.remotes.get(remoteId);
      const remoteSocket = record?.socketId ? io.sockets.sockets.get(record.socketId) : undefined;
      remoteSocket?.disconnect(true);
      state.remotes.delete(remoteId);
      void pushStatusToOperator();
    });

    socket.on('operator:disconnectAll', () => {
      if (data.role !== 'operator') return;
      for (const remote of state.remotes.values()) {
        if (remote.socketId) io.sockets.sockets.get(remote.socketId)?.disconnect(true);
      }
      state.remotes.clear();
      void pushStatusToOperator();
    });

    socket.on('operator:updateRemotePermission', ({ remoteId, permission }) => {
      if (data.role !== 'operator') return;
      const record = state.remotes.get(remoteId);
      if (record) record.permission = permission;
      const remembered = state.rememberedDevices.get(remoteId);
      if (remembered) {
        remembered.permission = permission;
        if (state.operatorSocketId) io.to(state.operatorSocketId).emit('operator:deviceRemembered', remembered);
      }
      void pushStatusToOperator();
    });

    socket.on('operator:setLive', (payload) => {
      if (data.role !== 'operator') return;
      state.liveBidder = payload;
      io.to('remotes').emit('bidder:liveChanged', payload);
      void pushStatusToOperator();
    });

    socket.on('operator:clearDisplay', () => {
      if (data.role !== 'operator') return;
      state.liveBidder = null;
      io.to('remotes').emit('bidder:liveChanged', null);
      void pushStatusToOperator();
    });

    socket.on('operator:lookupResult', ({ requestId, result, displayName, company }) => {
      if (data.role !== 'operator') return;
      const pending = pendingLookups.get(requestId);
      if (!pending) return;
      clearTimeout(pending.timeoutHandle);
      pendingLookups.delete(requestId);

      const { remoteId, bidderNumber } = pending;
      const remote = state.remotes.get(remoteId);

      if (result === 'unknown') {
        sendSubmissionResult(remoteId, { requestId, status: 'unknown', bidderNumber });
        return;
      }
      if (result === 'duplicate') {
        sendSubmissionResult(remoteId, { requestId, status: 'duplicate', bidderNumber });
        return;
      }

      const outcome = remote ? decideSubmissionOutcome(state.remoteMode, remote.permission) : 'blocked';
      if (outcome === 'blocked') {
        sendSubmissionResult(remoteId, {
          requestId,
          status: 'rejected',
          bidderNumber,
          message: "This remote doesn't have permission to submit bidders.",
        });
        return;
      }

      if (outcome === 'direct') {
        if (state.operatorSocketId) {
          io.to(state.operatorSocketId).emit('operator:showBidder', { requestId, bidderNumber, displayName: displayName ?? '', company });
        }
        sendSubmissionResult(remoteId, { requestId, status: 'shown', bidderNumber, displayName, company });
        return;
      }

      if (outcome === 'preview') {
        if (state.operatorSocketId) {
          io.to(state.operatorSocketId).emit('operator:previewBidder', { requestId, bidderNumber, displayName: displayName ?? '', company });
        }
        sendSubmissionResult(remoteId, { requestId, status: 'previewed', bidderNumber, displayName, company });
        return;
      }

      // approval
      if (!remote) return;
      const request = state.createPendingRequest({
        id: requestId,
        remoteId,
        remoteName: remote.name,
        bidderNumber,
        displayName: displayName ?? '',
        company,
      });
      if (state.operatorSocketId) {
        io.to(state.operatorSocketId).emit('operator:approvalRequest', request);
      }
      sendSubmissionResult(remoteId, { requestId, status: 'pending', bidderNumber, displayName, company });
      void pushStatusToOperator();
    });

    socket.on('operator:approveRequest', ({ requestId, action }) => {
      if (data.role !== 'operator') return;
      const request = state.pendingRequests.get(requestId);
      if (!request) return;
      state.pendingRequests.delete(requestId);
      sendSubmissionResult(request.remoteId, {
        requestId,
        status: action === 'show' ? 'shown' : 'previewed',
        bidderNumber: request.bidderNumber,
        displayName: request.displayName,
        company: request.company,
      });
      void pushStatusToOperator();
    });

    socket.on('operator:rejectRequest', ({ requestId }) => {
      if (data.role !== 'operator') return;
      const request = state.pendingRequests.get(requestId);
      if (!request) return;
      state.pendingRequests.delete(requestId);
      sendSubmissionResult(request.remoteId, {
        requestId,
        status: 'rejected',
        bidderNumber: request.bidderNumber,
        message: 'The operator rejected this request.',
      });
      void pushStatusToOperator();
    });

    socket.on('remote:authenticate', ({ deviceId, deviceName, pin, token }) => {
      if (!state.remoteAccessEnabled) {
        socket.emit('remote:rejected', { reason: 'Remote access is currently turned off.' });
        return;
      }
      const remembered = state.rememberDevices ? state.rememberedDevices.get(deviceId) : undefined;
      const isKnown = state.remotes.has(deviceId) || !!remembered;
      if (!state.acceptingNewConnections && !isKnown) {
        socket.emit('remote:rejected', { reason: 'The operator has paused new remote connections.' });
        return;
      }

      const ip = socket.handshake.address;
      let authenticated = false;

      if (token) {
        if (!state.isTokenValid(token)) {
          socket.emit('remote:rejected', {
            reason: state.eventJoinToken
              ? 'This code is for a different event. Open that event on the operator, then scan its code.'
              : 'This QR code is no longer valid. Scan the code on the operator screen again.',
          });
          return;
        }
        authenticated = true;
      } else if (pin && state.isPinValid(pin)) {
        authenticated = true;
      } else if (remembered) {
        authenticated = true;
      } else if (!pin && !token) {
        socket.emit('remote:rejected', {
          reason: 'This device has not joined this event yet.',
          code: 'not-remembered',
        });
        return;
      }

      if (!authenticated) {
        const attempt = pinLimiter.attempt(ip);
        if (!attempt.allowed) {
          socket.emit('remote:rejected', {
            reason: `Too many incorrect attempts. Try again in ${Math.ceil(attempt.retryAfterMs / 1000)}s.`,
          });
          return;
        }
        socket.emit('remote:rejected', { reason: 'Incorrect PIN.' });
        return;
      }

      pinLimiter.reset(ip);
      const record = state.registerOrUpdateRemote(deviceId, deviceName, socket.id, remembered?.permission);
      data.role = 'remote';
      data.deviceId = deviceId;
      socket.join('remotes');

      if (state.rememberDevices) {
        const saved = {
          id: record.id,
          name: record.name,
          permission: record.permission,
          rememberedAt: Date.now(),
        };
        state.rememberedDevices.set(record.id, saved);
        if (state.operatorSocketId) io.to(state.operatorSocketId).emit('operator:deviceRemembered', saved);
      }

      socket.emit('remote:authenticated', {
        remoteId: record.id,
        permission: record.permission,
        remoteMode: state.remoteMode,
        allowRemoteClear: state.allowRemoteClear,
        eventName: state.eventName,
        liveBidder: state.liveBidder,
      });
      socket.emit('remote:catalog', state.catalog);
      void pushStatusToOperator();
    });

    socket.on('operator:setRememberedDevices', ({ enabled, devices }) => {
      if (data.role !== 'operator') return;
      const next = new Map<string, (typeof devices)[number]>();
      for (const device of (devices ?? []).slice(0, 100)) {
        if (!device?.id) continue;
        next.set(String(device.id), {
          id: String(device.id),
          name: String(device.name ?? 'Remote').slice(0, 80),
          permission: device.permission ?? 'keypad-only',
          rememberedAt: Number(device.rememberedAt) || Date.now(),
        });
      }
      state.rememberDevices = enabled;
      state.rememberedDevices.clear();
      if (enabled) {
        for (const [id, device] of next) state.rememberedDevices.set(id, device);
      }
      void pushStatusToOperator();
    });

    socket.on('operator:forgetDevice', ({ deviceId }) => {
      if (data.role !== 'operator') return;
      state.rememberedDevices.delete(deviceId);
      const remote = state.remotes.get(deviceId);
      const remoteSocket = remote?.socketId ? io.sockets.sockets.get(remote.socketId) : undefined;
      remoteSocket?.emit('remote:rejected', {
        reason: 'This device was removed from the event. Enter the PIN to join again.',
        code: 'forgotten',
      });
      remoteSocket?.disconnect(true);
      if (remote) state.remotes.delete(deviceId);
      void pushStatusToOperator();
    });

    socket.on('operator:syncCatalog', (payload) => {
      if (data.role !== 'operator') return;
      state.catalog = {
        bidders: (payload.bidders ?? []).slice(0, 5000).map((bidder) => ({
          number: String(bidder.number ?? '').slice(0, 32),
          displayName: String(bidder.displayName ?? '').slice(0, 200),
        })),
        history: (payload.history ?? []).slice(0, 20).map((entry) => ({
          id: String(entry.id ?? ''),
          bidderNumber: String(entry.bidderNumber ?? '').slice(0, 32),
          displayName: String(entry.displayName ?? '').slice(0, 200),
          displayedAt: Number(entry.displayedAt) || 0,
        })),
        allowLetterNumbers: payload.allowLetterNumbers === true,
      };
      io.to('remotes').emit('remote:catalog', state.catalog);
    });

    socket.on('remote:submitBidder', ({ requestId, bidderNumber }) => {
      if (data.role !== 'remote' || !data.deviceId) return;

      const cached = resultCache.get(requestId);
      if (cached) {
        socket.emit('remote:submissionResult', cached);
        return;
      }

      state.touchRemote(data.deviceId);
      const remote = state.remotes.get(data.deviceId);
      if (!remote || remote.permission === 'view-only') {
        socket.emit('remote:submissionResult', {
          requestId,
          status: 'rejected',
          bidderNumber,
          message: "This remote doesn't have permission to submit bidders.",
        });
        return;
      }

      if (!state.operatorSocketId) {
        socket.emit('remote:submissionResult', {
          requestId,
          status: 'error',
          bidderNumber,
          message: 'The main BidBoard operator is not connected.',
        });
        return;
      }

      const timeoutHandle = setTimeout(() => {
        pendingLookups.delete(requestId);
        sendSubmissionResult(data.deviceId!, {
          requestId,
          status: 'error',
          bidderNumber,
          message: 'The operator did not respond in time.',
        });
      }, LOOKUP_TIMEOUT_MS);

      pendingLookups.set(requestId, { remoteId: data.deviceId, bidderNumber, timeoutHandle });
      io.to(state.operatorSocketId).emit('operator:lookupRequest', { requestId, bidderNumber });
    });

    socket.on('remote:clearRequest', () => {
      if (data.role !== 'remote' || !data.deviceId) return;
      const remote = state.remotes.get(data.deviceId);
      if (!remote || remote.permission === 'view-only') {
        socket.emit('error', { message: 'This remote is not permitted to clear the display.' });
        return;
      }
      state.liveBidder = null;
      io.to('remotes').emit('bidder:liveChanged', null);
      io.to('operators').emit('operator:commandClear');
      void pushStatusToOperator();
    });

    socket.on('remote:heartbeat', () => {
      if (data.role === 'remote' && data.deviceId) state.touchRemote(data.deviceId);
    });

    socket.on('disconnect', () => {
      if (data.role === 'operator' && state.operatorSocketId === socket.id) {
        const remaining = io.sockets.adapter.rooms.get('operators');
        const next = remaining ? [...remaining].find((id) => id !== socket.id) : undefined;
        state.operatorSocketId = next ?? null;
      }
      if (data.role === 'remote') {
        state.markSocketDisconnected(socket.id);
        void pushStatusToOperator();
      }
    });
  });

  return { state };
}
