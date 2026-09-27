import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  OperatorUpdateSettingsPayload,
  RemoteCatalog,
  RemotePermission,
  RememberedDevice,
  ServerStatus,
  ServerToClientEvents,
} from '../shared/socketTypes';
import { getSocketUrl } from '../lib/socketUrl';
import type { AudienceCurrentBidder, Bidder, HistoryEntry } from '../types';

export type LookupOutcome =
  | { result: 'unique'; displayName: string; company?: string }
  | { result: 'duplicate' }
  | { result: 'unknown' };

interface UseRemoteServerParams {
  liveBidder: AudienceCurrentBidder | null;
  eventName: string;
  joinToken: string;
  bidders: Bidder[];
  history: HistoryEntry[];
  allowLetterNumbers: boolean;
  rememberDevices: boolean;
  rememberedDevices: RememberedDevice[];
  onRememberDevice: (device: RememberedDevice) => void;
  lookupBidder: (query: string) => LookupOutcome;
  onRemoteShow: (bidderNumber: string, displayName: string, company: string | undefined) => void;
  onRemotePreview: (bidderNumber: string, displayName: string, company: string | undefined) => void;
  onRemoteClear: () => void;
}

function toCatalog(bidders: Bidder[], history: HistoryEntry[], allowLetterNumbers: boolean): RemoteCatalog {
  return {
    bidders: bidders.map((bidder) => ({ number: bidder.number, displayName: bidder.displayName })),
    history: history.map((entry) => ({
      id: entry.id,
      bidderNumber: entry.bidderNumber,
      displayName: entry.displayName,
      displayedAt: entry.displayedAt,
    })),
    allowLetterNumbers,
  };
}

/** Connects the operator's browser to the local BidBoard remote-control
 * server (if one is running). The server is entirely optional — when it's
 * not reachable, this simply reports `serverOnline: false` and the rest of
 * BidBoard (bidder list, audience display via BroadcastChannel) keeps
 * working exactly as before. */
export function useRemoteServer(params: UseRemoteServerParams) {
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [serverOnline, setServerOnline] = useState(false);
  const [status, setStatus] = useState<ServerStatus | null>(null);

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(getSocketUrl(), {
      reconnection: true,
      reconnectionDelay: 1000,
      timeout: 4000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setServerOnline(true);
      socket.emit('operator:hello');
      socket.emit('operator:updateSettings', {
        eventName: paramsRef.current.eventName,
        joinToken: paramsRef.current.joinToken,
      });
      socket.emit('operator:setRememberedDevices', {
        enabled: paramsRef.current.rememberDevices,
        devices: paramsRef.current.rememberedDevices,
      });
    });
    socket.on('disconnect', () => setServerOnline(false));
    socket.on('connect_error', () => setServerOnline(false));

    socket.on('server:status', (payload) => setStatus(payload));

    socket.on('operator:lookupRequest', ({ requestId, bidderNumber }) => {
      const outcome = paramsRef.current.lookupBidder(bidderNumber);
      if (outcome.result === 'unique') {
        socket.emit('operator:lookupResult', {
          requestId,
          result: 'unique',
          displayName: outcome.displayName,
          company: outcome.company,
        });
      } else {
        socket.emit('operator:lookupResult', { requestId, result: outcome.result });
      }
    });

    socket.on('operator:showBidder', ({ bidderNumber, displayName, company }) => {
      paramsRef.current.onRemoteShow(bidderNumber, displayName, company);
    });

    socket.on('operator:previewBidder', ({ bidderNumber, displayName, company }) => {
      paramsRef.current.onRemotePreview(bidderNumber, displayName, company);
    });

    socket.on('operator:commandClear', () => {
      paramsRef.current.onRemoteClear();
    });

    socket.on('operator:deviceRemembered', (device) => {
      paramsRef.current.onRememberDevice(device);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!serverOnline) return;
    const socket = socketRef.current;
    if (!socket) return;
    if (params.liveBidder) {
      socket.emit('operator:setLive', params.liveBidder);
    } else {
      socket.emit('operator:clearDisplay');
    }
  }, [params.liveBidder, serverOnline]);

  useEffect(() => {
    if (!serverOnline) return;
    socketRef.current?.emit('operator:updateSettings', {
      eventName: params.eventName,
      joinToken: params.joinToken,
    });
  }, [params.eventName, params.joinToken, serverOnline]);

  useEffect(() => {
    if (!serverOnline) return;
    socketRef.current?.emit('operator:syncCatalog', toCatalog(params.bidders, params.history, params.allowLetterNumbers));
  }, [params.bidders, params.history, params.allowLetterNumbers, serverOnline]);

  useEffect(() => {
    if (!serverOnline) return;
    socketRef.current?.emit('operator:setRememberedDevices', {
      enabled: params.rememberDevices,
      devices: params.rememberedDevices,
    });
  }, [params.rememberDevices, params.rememberedDevices, serverOnline]);

  const updateSettings = useCallback((patch: OperatorUpdateSettingsPayload) => {
    socketRef.current?.emit('operator:updateSettings', patch);
  }, []);

  const regeneratePin = useCallback(() => {
    socketRef.current?.emit('operator:regeneratePin');
  }, []);

  const disconnectRemote = useCallback((remoteId: string) => {
    socketRef.current?.emit('operator:disconnectRemote', { remoteId });
  }, []);

  const disconnectAll = useCallback(() => {
    socketRef.current?.emit('operator:disconnectAll');
  }, []);

  const updateRemotePermission = useCallback((remoteId: string, permission: RemotePermission) => {
    socketRef.current?.emit('operator:updateRemotePermission', { remoteId, permission });
  }, []);

  const approveRequest = useCallback((requestId: string, action: 'show' | 'preview') => {
    socketRef.current?.emit('operator:approveRequest', { requestId, action });
  }, []);

  const rejectRequest = useCallback((requestId: string) => {
    socketRef.current?.emit('operator:rejectRequest', { requestId });
  }, []);

  const forgetRememberedDevice = useCallback((deviceId: string) => {
    socketRef.current?.emit('operator:forgetDevice', { deviceId });
  }, []);

  return {
    serverOnline,
    status,
    updateSettings,
    regeneratePin,
    disconnectRemote,
    disconnectAll,
    updateRemotePermission,
    approveRequest,
    rejectRequest,
    forgetRememberedDevice,
  };
}
