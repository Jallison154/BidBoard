import { randomBytes, randomInt } from 'node:crypto';
import type {
  PendingRequestInfo,
  RemoteCurrentBidder,
  RemoteDeviceInfo,
  RemoteMode,
  RemotePermission,
} from '../src/shared/socketTypes';

const PIN_TTL_MS = 1000 * 60 * 60 * 12; // a PIN stays valid for a long working session
const TOKEN_TTL_MS = 1000 * 60 * 10; // QR join tokens are short-lived
const REMOTE_STALE_MS = 1000 * 60 * 30; // drop remotes that stop heartbeating entirely

export interface ConnectionToken {
  token: string;
  expiresAt: number;
  used: boolean;
}

export interface RemoteRecord extends RemoteDeviceInfo {
  socketId: string | null;
}

export class ServerState {
  remoteAccessEnabled = false;
  acceptingNewConnections = true;
  remoteMode: RemoteMode = 'approval';
  allowRemoteClear = false;
  eventName = '';
  liveBidder: RemoteCurrentBidder | null = null;
  operatorSocketId: string | null = null;

  pin: string;
  private pinIssuedAt: number;
  private token: ConnectionToken;

  readonly remotes = new Map<string, RemoteRecord>();
  readonly pendingRequests = new Map<string, PendingRequestInfo>();
  readonly seenRequestIds = new Set<string>();

  constructor() {
    this.pin = ServerState.generatePin();
    this.pinIssuedAt = Date.now();
    this.token = ServerState.generateToken();
  }

  static generatePin(): string {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  static generateToken(): ConnectionToken {
    return { token: randomBytes(12).toString('hex'), expiresAt: Date.now() + TOKEN_TTL_MS, used: false };
  }

  regeneratePin(): string {
    this.pin = ServerState.generatePin();
    this.pinIssuedAt = Date.now();
    this.token = ServerState.generateToken();
    return this.pin;
  }

  get currentToken(): string {
    if (Date.now() > this.token.expiresAt) {
      this.token = ServerState.generateToken();
    }
    return this.token.token;
  }

  isPinValid(candidate: string): boolean {
    if (Date.now() - this.pinIssuedAt > PIN_TTL_MS) return false;
    return candidate.trim() === this.pin;
  }

  isTokenValid(candidate: string): boolean {
    if (candidate !== this.token.token) return false;
    if (Date.now() > this.token.expiresAt) return false;
    return true;
  }

  registerOrUpdateRemote(deviceId: string, deviceName: string, socketId: string): RemoteRecord {
    const existing = this.remotes.get(deviceId);
    if (existing) {
      existing.name = deviceName || existing.name;
      existing.socketId = socketId;
      existing.lastActivityAt = Date.now();
      return existing;
    }
    const record: RemoteRecord = {
      id: deviceId,
      name: deviceName || 'Remote',
      permission: 'keypad-only',
      connectedAt: Date.now(),
      lastActivityAt: Date.now(),
      socketId,
    };
    this.remotes.set(deviceId, record);
    return record;
  }

  touchRemote(deviceId: string): void {
    const remote = this.remotes.get(deviceId);
    if (remote) remote.lastActivityAt = Date.now();
  }

  markSocketDisconnected(socketId: string): void {
    for (const remote of this.remotes.values()) {
      if (remote.socketId === socketId) remote.socketId = null;
    }
  }

  removeStaleRemotes(): void {
    const now = Date.now();
    for (const [id, remote] of this.remotes) {
      if (remote.socketId === null && now - remote.lastActivityAt > REMOTE_STALE_MS) {
        this.remotes.delete(id);
      }
    }
  }

  remotesList(): RemoteDeviceInfo[] {
    return [...this.remotes.values()]
      .filter((r) => r.socketId !== null)
      .map(({ id, name, permission, connectedAt, lastActivityAt }) => ({
        id,
        name,
        permission,
        connectedAt,
        lastActivityAt,
      }));
  }

  /** The pending request's id is always the remote's original submission
   * requestId (not a freshly generated one) — the remote is waiting on that
   * exact id for its final result, so the approve/reject outcome must be
   * addressable by it. */
  createPendingRequest(input: Omit<PendingRequestInfo, 'createdAt'>): PendingRequestInfo {
    const request: PendingRequestInfo = { ...input, createdAt: Date.now() };
    this.pendingRequests.set(request.id, request);
    return request;
  }

  pendingRequestsList(): PendingRequestInfo[] {
    return [...this.pendingRequests.values()];
  }
}

/** Decides what should happen to a valid (uniquely-matched) bidder submission,
 * given the remote's permission and the operator's global remote mode.
 * Kept pure and separate from socket wiring so it's trivially unit-testable. */
export function decideSubmissionOutcome(
  mode: RemoteMode,
  permission: RemotePermission,
): 'direct' | 'preview' | 'approval' | 'blocked' {
  if (permission === 'view-only') return 'blocked';
  return mode;
}
