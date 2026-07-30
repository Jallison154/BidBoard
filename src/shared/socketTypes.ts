/**
 * Shared WebSocket contract between the BidBoard operator page, the mobile
 * remote page, and the local Node server. Imported by both src/ (browser)
 * and server/ (Node) so client and server can never drift apart on shapes.
 *
 * The server holds only ephemeral, in-memory session state (remotes, pending
 * requests, PIN). The operator's browser remains the sole source of truth for
 * the event, bidder list, and display settings — the server never persists
 * or independently manages that data.
 */

export type RemotePermission = 'keypad-only' | 'operator-remote' | 'view-only';

export type RemoteMode = 'direct' | 'preview' | 'approval';

export interface RemoteCurrentBidder {
  bidderNumber: string;
  displayName: string;
  company?: string;
}

export interface RemoteDeviceInfo {
  id: string;
  name: string;
  permission: RemotePermission;
  connectedAt: number;
  lastActivityAt: number;
}

export interface PendingRequestInfo {
  id: string;
  remoteId: string;
  remoteName: string;
  bidderNumber: string;
  displayName: string;
  company?: string;
  createdAt: number;
}

export interface ServerStatus {
  remoteAccessEnabled: boolean;
  acceptingNewConnections: boolean;
  pin: string;
  port: number;
  localIps: string[];
  remoteUrl: string | null;
  qrDataUrl: string | null;
  remoteMode: RemoteMode;
  allowRemoteClear: boolean;
  eventName: string;
  remotes: RemoteDeviceInfo[];
  pendingRequests: PendingRequestInfo[];
  operatorConnected: boolean;
}

export type SubmissionStatus =
  | 'shown'
  | 'previewed'
  | 'pending'
  | 'unknown'
  | 'duplicate'
  | 'rejected'
  | 'error';

export interface SubmissionResult {
  requestId: string;
  status: SubmissionStatus;
  bidderNumber: string;
  displayName?: string;
  company?: string;
  message?: string;
}

export interface RemoteAuthPayload {
  deviceId: string;
  deviceName: string;
  pin?: string;
  token?: string;
}

export interface RemoteAuthenticatedPayload {
  remoteId: string;
  permission: RemotePermission;
  remoteMode: RemoteMode;
  allowRemoteClear: boolean;
  eventName: string;
  liveBidder: RemoteCurrentBidder | null;
}

export interface OperatorUpdateSettingsPayload {
  remoteAccessEnabled?: boolean;
  acceptingNewConnections?: boolean;
  remoteMode?: RemoteMode;
  allowRemoteClear?: boolean;
  eventName?: string;
}

export interface LookupRequestPayload {
  requestId: string;
  bidderNumber: string;
}

export interface LookupResultPayload {
  requestId: string;
  result: 'unique' | 'duplicate' | 'unknown';
  displayName?: string;
  company?: string;
}

/** Events emitted by clients (operator browser or remote device) to the server. */
export interface ClientToServerEvents {
  'operator:hello': () => void;
  'operator:lookupResult': (payload: LookupResultPayload) => void;
  'operator:setLive': (payload: RemoteCurrentBidder) => void;
  'operator:clearDisplay': () => void;
  'operator:approveRequest': (payload: { requestId: string; action: 'show' | 'preview' }) => void;
  'operator:rejectRequest': (payload: { requestId: string }) => void;
  'operator:updateSettings': (payload: OperatorUpdateSettingsPayload) => void;
  'operator:regeneratePin': () => void;
  'operator:disconnectRemote': (payload: { remoteId: string }) => void;
  'operator:disconnectAll': () => void;
  'operator:updateRemotePermission': (payload: { remoteId: string; permission: RemotePermission }) => void;

  'remote:authenticate': (payload: RemoteAuthPayload) => void;
  'remote:submitBidder': (payload: { requestId: string; bidderNumber: string }) => void;
  'remote:clearRequest': (payload: { requestId: string }) => void;
  'remote:heartbeat': () => void;
}

/** Events emitted by the server to clients. */
export interface ServerToClientEvents {
  'server:status': (status: ServerStatus) => void;
  /** Ask the operator's browser to look up a bidder number against its own
   * (authoritative) bidder list — the server never holds bidder data itself. */
  'operator:lookupRequest': (payload: LookupRequestPayload) => void;
  /** Tell the operator to actually show this bidder locally (Direct Show mode). */
  'operator:showBidder': (payload: RemoteCurrentBidder & { requestId: string }) => void;
  /** Tell the operator to stage this bidder into its own preview, not yet live (Send to Preview mode). */
  'operator:previewBidder': (payload: RemoteCurrentBidder & { requestId: string }) => void;
  /** Tell the operator to clear its local display in response to a permitted remote clear request. */
  'operator:commandClear': () => void;
  'operator:approvalRequest': (payload: PendingRequestInfo) => void;
  'remote:authenticated': (payload: RemoteAuthenticatedPayload) => void;
  'remote:rejected': (payload: { reason: string }) => void;
  'remote:submissionResult': (payload: SubmissionResult) => void;
  'bidder:liveChanged': (payload: RemoteCurrentBidder | null) => void;
  'remotes:listChanged': (remotes: RemoteDeviceInfo[]) => void;
  error: (payload: { message: string }) => void;
}
