import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { getSocketUrl } from '../lib/socketUrl';
import type {
  ClientToServerEvents,
  RemoteCatalog,
  RemoteCurrentBidder,
  RemoteMode,
  RemotePermission,
  ServerToClientEvents,
  SubmissionResult,
} from '../shared/socketTypes';

const DEVICE_ID_KEY = 'bidboard-remote-device-id';
const DEVICE_NAME_KEY = 'bidboard-remote-device-name';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

function detectDefaultDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPad/.test(ua)) return 'iPad Remote';
  if (/iPhone/.test(ua)) return 'iPhone Remote';
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android Remote' : 'Android Tablet Remote';
  return 'Browser Remote';
}

function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return uuidv4();
  }
}

function getStoredDeviceName(): string {
  try {
    return localStorage.getItem(DEVICE_NAME_KEY) ?? detectDefaultDeviceName();
  } catch {
    return detectDefaultDeviceName();
  }
}

function storeDeviceName(name: string): void {
  try {
    localStorage.setItem(DEVICE_NAME_KEY, name);
  } catch {
    // best-effort; the name just won't be remembered next visit
  }
}

export interface RemoteSession {
  permission: RemotePermission;
  remoteMode: RemoteMode;
  allowRemoteClear: boolean;
  eventName: string;
}

export function useRemoteConnection() {
  const [deviceId] = useState(getOrCreateDeviceId);
  const [deviceName, setDeviceNameState] = useState(getStoredDeviceName);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [authenticated, setAuthenticated] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);
  const [session, setSession] = useState<RemoteSession | null>(null);
  const [liveBidder, setLiveBidder] = useState<RemoteCurrentBidder | null>(null);
  const [catalog, setCatalog] = useState<RemoteCatalog>({ bidders: [], history: [] });
  const [lastResult, setLastResult] = useState<SubmissionResult | null>(null);

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const pendingAuthRef = useRef<{ pin?: string; token?: string } | null>(null);
  const resultHandlersRef = useRef(new Map<string, (result: SubmissionResult) => void>());
  const authenticatedRef = useRef(false);

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(getSocketUrl(), {
      reconnection: true,
      reconnectionDelay: 1000,
      timeout: 4000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connected');
      const scannedToken = new URLSearchParams(window.location.search).get('token');
      const auth = pendingAuthRef.current ?? (scannedToken ? { token: scannedToken } : null);
      if (auth) {
        pendingAuthRef.current = auth;
        socket.emit('remote:authenticate', { deviceId, deviceName, ...auth });
      } else {
        socket.emit('remote:authenticate', { deviceId, deviceName });
      }
    });
    socket.on('disconnect', () => {
      authenticatedRef.current = false;
      setAuthenticated(false);
      setStatus('reconnecting');
    });
    socket.io.on('reconnect_attempt', () => setStatus('reconnecting'));
    socket.on('connect_error', () => setStatus('disconnected'));

    socket.on('remote:authenticated', (payload) => {
      authenticatedRef.current = true;
      setAuthenticated(true);
      setRejection(null);
      setSession({
        permission: payload.permission,
        remoteMode: payload.remoteMode,
        allowRemoteClear: payload.allowRemoteClear,
        eventName: payload.eventName,
      });
      setLiveBidder(payload.liveBidder);
    });

    let rememberedRetried = false;
    let rememberedRetryTimer: number | null = null;

    socket.on('remote:rejected', ({ reason, code }) => {
      if (code === 'not-remembered') {
        if (!pendingAuthRef.current && !rememberedRetried) {
          rememberedRetried = true;
          rememberedRetryTimer = window.setTimeout(() => {
            if (!authenticatedRef.current && socket.connected && !pendingAuthRef.current) {
              socket.emit('remote:authenticate', { deviceId, deviceName });
            }
          }, 2000);
        }
        return;
      }
      if (code === 'forgotten') pendingAuthRef.current = null;
      authenticatedRef.current = false;
      setAuthenticated(false);
      setRejection(reason);
    });

    socket.on('bidder:liveChanged', (payload) => setLiveBidder(payload));
    socket.on('remote:catalog', (payload) => setCatalog(payload));

    socket.on('remote:submissionResult', (result) => {
      setLastResult(result);
      resultHandlersRef.current.get(result.requestId)?.(result);
      // 'pending' means an approval decision is still to come for this same
      // request id — keep the handler registered so the eventual approve/
      // reject result still reaches the caller instead of being dropped.
      if (result.status !== 'pending') {
        resultHandlersRef.current.delete(result.requestId);
      }
    });

    const heartbeat = window.setInterval(() => {
      if (socket.connected) socket.emit('remote:heartbeat');
    }, 5000);

    return () => {
      if (rememberedRetryTimer) window.clearTimeout(rememberedRetryTimer);
      window.clearInterval(heartbeat);
      socket.disconnect();
    };
  }, [deviceId, deviceName]);

  const connect = useCallback((auth: { pin?: string; token?: string }) => {
    pendingAuthRef.current = auth;
    setRejection(null);
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('remote:authenticate', { deviceId, deviceName, ...auth });
    }
  }, [deviceId, deviceName]);

  const setDeviceName = useCallback((name: string) => {
    setDeviceNameState(name);
    storeDeviceName(name);
  }, []);

  const submitBidder = useCallback((bidderNumber: string, onResult: (result: SubmissionResult) => void): string => {
    const requestId = uuidv4();
    resultHandlersRef.current.set(requestId, onResult);
    socketRef.current?.emit('remote:submitBidder', { requestId, bidderNumber });
    return requestId;
  }, []);

  const requestClear = useCallback(() => {
    const requestId = uuidv4();
    setLiveBidder(null);
    socketRef.current?.emit('remote:clearRequest', { requestId });
  }, []);

  return {
    deviceId,
    deviceName,
    setDeviceName,
    status,
    authenticated,
    rejection,
    session,
    liveBidder,
    catalog,
    lastResult,
    connect,
    submitBidder,
    requestClear,
  };
}
