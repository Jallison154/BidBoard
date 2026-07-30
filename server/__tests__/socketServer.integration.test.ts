import { createServer, type Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { attachSocketServer } from '../socketServer';
import type {
  ClientToServerEvents,
  PendingRequestInfo,
  RemoteAuthenticatedPayload,
  ServerToClientEvents,
  SubmissionResult,
} from '../../src/shared/socketTypes';

type Client = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

let httpServer: HttpServer;
let io: Server<ClientToServerEvents, ServerToClientEvents>;
let port: number;
const clients: Client[] = [];

function connectClient(): Promise<Client> {
  return new Promise((resolve) => {
    const client: Client = ioClient(`http://localhost:${port}`, { transports: ['websocket'], forceNew: true });
    clients.push(client);
    client.on('connect', () => resolve(client));
  });
}

function once<E extends keyof ServerToClientEvents>(
  client: Client,
  event: E,
): Promise<Parameters<ServerToClientEvents[E]>[0]> {
  return new Promise((resolve) => {
    (client as unknown as { once: (event: E, cb: (payload: Parameters<ServerToClientEvents[E]>[0]) => void) => void }).once(
      event,
      (payload) => resolve(payload),
    );
  });
}

async function makeOperator(): Promise<Client> {
  const operator = await connectClient();
  operator.emit('operator:hello');
  await once(operator, 'server:status');
  return operator;
}

async function authenticateRemote(pin: string, deviceId = 'device-1', deviceName = 'Test Phone'): Promise<Client> {
  const remote = await connectClient();
  remote.emit('remote:authenticate', { deviceId, deviceName, pin });
  await once(remote, 'remote:authenticated');
  return remote;
}

beforeEach(async () => {
  httpServer = createServer();
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, { cors: { origin: '*' } });
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const address = httpServer.address();
  port = typeof address === 'object' && address ? address.port : 0;
  attachSocketServer(io, { port });
});

afterEach(async () => {
  for (const client of clients.splice(0)) client.disconnect();
  await new Promise<void>((resolve) => io.close(() => resolve()));
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

describe('remote authentication', () => {
  it('rejects a remote when remote access is disabled (the default)', async () => {
    await makeOperator();
    const remote = await connectClient();
    remote.emit('remote:authenticate', { deviceId: 'd1', deviceName: 'Phone', pin: '000000' });
    const rejection = await once(remote, 'remote:rejected');
    expect(rejection.reason).toMatch(/disabled|turned off/i);
  });

  it('accepts a remote with the correct PIN once access is enabled', async () => {
    const operator = await makeOperator();
    operator.emit('operator:updateSettings', { remoteAccessEnabled: true });
    const status = await once(operator, 'server:status');

    const remote = await connectClient();
    remote.emit('remote:authenticate', { deviceId: 'd1', deviceName: 'Phone', pin: status.pin });
    const auth: RemoteAuthenticatedPayload = await once(remote, 'remote:authenticated');
    expect(auth.permission).toBe('keypad-only');
  });

  it('rejects an incorrect PIN', async () => {
    const operator = await makeOperator();
    operator.emit('operator:updateSettings', { remoteAccessEnabled: true });
    await once(operator, 'server:status');

    const remote = await connectClient();
    remote.emit('remote:authenticate', { deviceId: 'd1', deviceName: 'Phone', pin: '000001' });
    const rejection = await once(remote, 'remote:rejected');
    expect(rejection.reason).toMatch(/incorrect pin/i);
  });

  it('rate-limits repeated incorrect PIN attempts', async () => {
    const operator = await makeOperator();
    operator.emit('operator:updateSettings', { remoteAccessEnabled: true });
    await once(operator, 'server:status');

    const remote = await connectClient();
    let lastReason = '';
    for (let i = 0; i < 6; i++) {
      remote.emit('remote:authenticate', { deviceId: 'd1', deviceName: 'Phone', pin: '000001' });
      const rejection = await once(remote, 'remote:rejected');
      lastReason = rejection.reason;
    }
    expect(lastReason).toMatch(/too many/i);
  });

  it('rejects a valid PIN when the operator has paused new connections, but allows a returning device', async () => {
    const operator = await makeOperator();
    operator.emit('operator:updateSettings', { remoteAccessEnabled: true, acceptingNewConnections: false });
    const status = await once(operator, 'server:status');

    const remote = await connectClient();
    remote.emit('remote:authenticate', { deviceId: 'new-device', deviceName: 'Phone', pin: status.pin });
    const rejection = await once(remote, 'remote:rejected');
    expect(rejection.reason).toMatch(/paused|not accepting/i);
  });
});

describe('bidder submission flows', () => {
  async function enableAccessAndGetPin(operator: Client, mode: 'direct' | 'preview' | 'approval' = 'approval') {
    operator.emit('operator:updateSettings', { remoteAccessEnabled: true, remoteMode: mode });
    const status = await once(operator, 'server:status');
    return status.pin;
  }

  it('shows a bidder immediately in Direct Show mode', async () => {
    const operator = await makeOperator();
    const pin = await enableAccessAndGetPin(operator, 'direct');
    const remote = await authenticateRemote(pin);

    const lookupPromise = once(operator, 'operator:lookupRequest');
    const submitPromise = new Promise<SubmissionResult>((resolve) => remote.once('remote:submissionResult', resolve));

    remote.emit('remote:submitBidder', { requestId: 'req-1', bidderNumber: '254' });

    const lookup = await lookupPromise;
    expect(lookup.bidderNumber).toBe('254');
    operator.emit('operator:lookupResult', { requestId: lookup.requestId, result: 'unique', displayName: 'John & Sarah Smith' });

    const result = await submitPromise;
    expect(result.status).toBe('shown');
    expect(result.displayName).toBe('John & Sarah Smith');
  });

  it('stages a bidder into preview without going live in Send to Preview mode', async () => {
    const operator = await makeOperator();
    const pin = await enableAccessAndGetPin(operator, 'preview');
    const remote = await authenticateRemote(pin);

    const previewPromise = once(operator, 'operator:previewBidder');
    remote.emit('remote:submitBidder', { requestId: 'req-2', bidderNumber: '101' });
    const lookup = await once(operator, 'operator:lookupRequest');
    operator.emit('operator:lookupResult', { requestId: lookup.requestId, result: 'unique', displayName: 'Alex Johnson' });

    const preview = await previewPromise;
    expect(preview.bidderNumber).toBe('101');

    const result = await once(remote, 'remote:submissionResult');
    expect(result.status).toBe('previewed');
  });

  it('requires operator approval by default before going live', async () => {
    const operator = await makeOperator();
    const pin = await enableAccessAndGetPin(operator, 'approval');
    const remote = await authenticateRemote(pin);

    const lookupPromise = once(operator, 'operator:lookupRequest');
    remote.emit('remote:submitBidder', { requestId: 'req-3', bidderNumber: '203' });
    const lookup = await lookupPromise;

    const approvalPromise = once(operator, 'operator:approvalRequest');
    const pendingPromise = once(remote, 'remote:submissionResult');
    operator.emit('operator:lookupResult', { requestId: lookup.requestId, result: 'unique', displayName: 'Maria Garcia' });
    const [approvalRequest, pendingResult]: [PendingRequestInfo, SubmissionResult] = await Promise.all([
      approvalPromise,
      pendingPromise,
    ]);
    expect(pendingResult.status).toBe('pending');
    expect(approvalRequest.bidderNumber).toBe('203');

    const finalPromise = once(remote, 'remote:submissionResult');
    operator.emit('operator:approveRequest', { requestId: approvalRequest.id, action: 'show' });
    const finalResult = await finalPromise;
    expect(finalResult.status).toBe('shown');
  });

  it('rejects an approval request when the operator declines', async () => {
    const operator = await makeOperator();
    const pin = await enableAccessAndGetPin(operator, 'approval');
    const remote = await authenticateRemote(pin);

    const lookupPromise = once(operator, 'operator:lookupRequest');
    remote.emit('remote:submitBidder', { requestId: 'req-4', bidderNumber: '203' });
    const lookup = await lookupPromise;

    const approvalPromise = once(operator, 'operator:approvalRequest');
    const pendingPromise = once(remote, 'remote:submissionResult');
    operator.emit('operator:lookupResult', { requestId: lookup.requestId, result: 'unique', displayName: 'Maria Garcia' });
    const [approvalRequest] = await Promise.all([approvalPromise, pendingPromise]);

    const finalPromise = once(remote, 'remote:submissionResult');
    operator.emit('operator:rejectRequest', { requestId: approvalRequest.id });

    const finalResult = await finalPromise;
    expect(finalResult.status).toBe('rejected');
  });

  it('reports an unknown bidder without prompting the operator to show anything', async () => {
    const operator = await makeOperator();
    const pin = await enableAccessAndGetPin(operator, 'direct');
    const remote = await authenticateRemote(pin);

    remote.emit('remote:submitBidder', { requestId: 'req-5', bidderNumber: '999' });
    const lookup = await once(operator, 'operator:lookupRequest');
    operator.emit('operator:lookupResult', { requestId: lookup.requestId, result: 'unknown' });

    const result = await once(remote, 'remote:submissionResult');
    expect(result.status).toBe('unknown');
  });

  it('reports a duplicate bidder number and tells the remote to resolve it on the main screen', async () => {
    const operator = await makeOperator();
    const pin = await enableAccessAndGetPin(operator, 'direct');
    const remote = await authenticateRemote(pin);

    remote.emit('remote:submitBidder', { requestId: 'req-6', bidderNumber: '254' });
    const lookup = await once(operator, 'operator:lookupRequest');
    operator.emit('operator:lookupResult', { requestId: lookup.requestId, result: 'duplicate' });

    const result = await once(remote, 'remote:submissionResult');
    expect(result.status).toBe('duplicate');
  });

  it('replays a cached result instead of re-processing a resubmitted request id', async () => {
    const operator = await makeOperator();
    const pin = await enableAccessAndGetPin(operator, 'direct');
    const remote = await authenticateRemote(pin);

    let lookupCount = 0;
    operator.on('operator:lookupRequest', ({ requestId }) => {
      lookupCount += 1;
      operator.emit('operator:lookupResult', { requestId, result: 'unique', displayName: 'Alex Johnson' });
    });

    remote.emit('remote:submitBidder', { requestId: 'stable-id', bidderNumber: '101' });
    const first = await once(remote, 'remote:submissionResult');
    expect(first.status).toBe('shown');

    remote.emit('remote:submitBidder', { requestId: 'stable-id', bidderNumber: '101' });
    const second = await once(remote, 'remote:submissionResult');
    expect(second.status).toBe('shown');
    expect(lookupCount).toBe(1);
  });

  it('rejects submissions from a view-only remote without contacting the operator', async () => {
    const operator = await makeOperator();
    const pin = await enableAccessAndGetPin(operator, 'direct');
    const remote = await authenticateRemote(pin, 'view-device');

    operator.emit('operator:updateRemotePermission', { remoteId: 'view-device', permission: 'view-only' });
    await once(operator, 'server:status');

    let lookupFired = false;
    operator.once('operator:lookupRequest', () => {
      lookupFired = true;
    });

    remote.emit('remote:submitBidder', { requestId: 'req-7', bidderNumber: '101' });
    const result = await once(remote, 'remote:submissionResult');
    expect(result.status).toBe('rejected');
    expect(lookupFired).toBe(false);
  });

  it('errors out if the operator is not connected', async () => {
    const operator = await makeOperator();
    const pin = await enableAccessAndGetPin(operator, 'direct');
    const remote = await authenticateRemote(pin);
    operator.disconnect();
    // give the server a tick to process the operator disconnect
    await new Promise((r) => setTimeout(r, 50));

    remote.emit('remote:submitBidder', { requestId: 'req-8', bidderNumber: '101' });
    const result = await once(remote, 'remote:submissionResult');
    expect(result.status).toBe('error');
  });
});

describe('clear-display permission', () => {
  it('only lets an Operator Remote clear the display when explicitly allowed', async () => {
    const operator = await makeOperator();
    operator.emit('operator:updateSettings', { remoteAccessEnabled: true, allowRemoteClear: true });
    const status = await once(operator, 'server:status');
    const remote = await authenticateRemote(status.pin, 'clear-device');

    operator.emit('operator:updateRemotePermission', { remoteId: 'clear-device', permission: 'operator-remote' });
    await once(operator, 'server:status');

    const commandPromise = once(operator, 'operator:commandClear');
    remote.emit('remote:clearRequest', { requestId: 'clear-1' });
    await expect(commandPromise).resolves.toBeUndefined();
  });

  it('rejects a clear request from a keypad-only remote', async () => {
    const operator = await makeOperator();
    operator.emit('operator:updateSettings', { remoteAccessEnabled: true, allowRemoteClear: true });
    const status = await once(operator, 'server:status');
    const remote = await authenticateRemote(status.pin, 'keypad-device');

    const errorPromise = once(remote, 'error');
    remote.emit('remote:clearRequest', { requestId: 'clear-2' });
    const error = await errorPromise;
    expect(error.message).toMatch(/not permitted/i);
  });
});

describe('operator device management', () => {
  it('disconnects an individual remote on request', async () => {
    const operator = await makeOperator();
    operator.emit('operator:updateSettings', { remoteAccessEnabled: true });
    const status = await once(operator, 'server:status');
    const remote = await authenticateRemote(status.pin, 'to-disconnect');

    const disconnectPromise = new Promise<void>((resolve) => remote.on('disconnect', () => resolve()));
    operator.emit('operator:disconnectRemote', { remoteId: 'to-disconnect' });
    await disconnectPromise;
  });

  it('disconnects all remotes at once', async () => {
    const operator = await makeOperator();
    operator.emit('operator:updateSettings', { remoteAccessEnabled: true });
    const status = await once(operator, 'server:status');
    const remoteA = await authenticateRemote(status.pin, 'device-a');
    const remoteB = await authenticateRemote(status.pin, 'device-b');

    const disconnectedA = new Promise<void>((resolve) => remoteA.on('disconnect', () => resolve()));
    const disconnectedB = new Promise<void>((resolve) => remoteB.on('disconnect', () => resolve()));
    operator.emit('operator:disconnectAll');
    await Promise.all([disconnectedA, disconnectedB]);
  });
});
