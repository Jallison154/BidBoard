import { describe, expect, it } from 'vitest';
import { ServerState, decideSubmissionOutcome } from '../state';

describe('ServerState PIN and token handling', () => {
  it('generates a zero-padded 6-digit PIN', () => {
    const state = new ServerState();
    expect(state.pin).toMatch(/^\d{6}$/);
  });

  it('validates the current PIN and rejects an incorrect one', () => {
    const state = new ServerState();
    expect(state.isPinValid(state.pin)).toBe(true);
    expect(state.isPinValid('000000' === state.pin ? '111111' : '000000')).toBe(false);
  });

  it('trims whitespace when validating a PIN', () => {
    const state = new ServerState();
    expect(state.isPinValid(`  ${state.pin}  `)).toBe(true);
  });

  it('regenerating the PIN produces a different PIN and invalidates the old one', () => {
    const state = new ServerState();
    const oldPin = state.pin;
    const newPin = state.regeneratePin();
    expect(newPin).not.toBe(oldPin);
    expect(state.isPinValid(oldPin)).toBe(false);
    expect(state.isPinValid(newPin)).toBe(true);
  });

  it('rejects a token that does not match the current one', () => {
    const state = new ServerState();
    expect(state.isTokenValid('not-the-real-token')).toBe(false);
  });

  it('accepts the current valid token', () => {
    const state = new ServerState();
    expect(state.isTokenValid(state.currentToken)).toBe(true);
  });
});

describe('ServerState remote registry', () => {
  it('registers a new remote with keypad-only permission by default', () => {
    const state = new ServerState();
    const remote = state.registerOrUpdateRemote('device-1', 'My Phone', 'socket-1');
    expect(remote.permission).toBe('keypad-only');
    expect(remote.name).toBe('My Phone');
  });

  it('preserves an existing remote permission across reconnects', () => {
    const state = new ServerState();
    state.registerOrUpdateRemote('device-1', 'My Phone', 'socket-1');
    state.remotes.get('device-1')!.permission = 'operator-remote';

    const reconnected = state.registerOrUpdateRemote('device-1', 'My Phone', 'socket-2');
    expect(reconnected.permission).toBe('operator-remote');
    expect(reconnected.socketId).toBe('socket-2');
  });

  it('only lists remotes that currently have a live socket', () => {
    const state = new ServerState();
    state.registerOrUpdateRemote('device-1', 'Phone A', 'socket-1');
    state.registerOrUpdateRemote('device-2', 'Phone B', 'socket-2');
    state.markSocketDisconnected('socket-2');

    const list = state.remotesList();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('device-1');
  });

  it('marks the matching remote as disconnected by socket id', () => {
    const state = new ServerState();
    state.registerOrUpdateRemote('device-1', 'Phone A', 'socket-1');
    state.markSocketDisconnected('socket-1');
    expect(state.remotes.get('device-1')!.socketId).toBeNull();
  });
});

describe('ServerState pending requests', () => {
  it('creates pending requests with unique ids', () => {
    const state = new ServerState();
    const a = state.createPendingRequest({ id: 'req-a', remoteId: 'd1', remoteName: 'A', bidderNumber: '101', displayName: 'Alex' });
    const b = state.createPendingRequest({ id: 'req-b', remoteId: 'd1', remoteName: 'A', bidderNumber: '102', displayName: 'Sam' });
    expect(a.id).not.toBe(b.id);
    expect(state.pendingRequestsList()).toHaveLength(2);
  });

  it('keys the pending request by the remote submission requestId so the eventual outcome reaches the right handler', () => {
    const state = new ServerState();
    const request = state.createPendingRequest({
      id: 'original-request-id',
      remoteId: 'd1',
      remoteName: 'A',
      bidderNumber: '101',
      displayName: 'Alex',
    });
    expect(request.id).toBe('original-request-id');
    expect(state.pendingRequests.get('original-request-id')).toBe(request);
  });
});

describe('decideSubmissionOutcome', () => {
  it('blocks view-only remotes regardless of mode', () => {
    expect(decideSubmissionOutcome('direct', 'view-only')).toBe('blocked');
    expect(decideSubmissionOutcome('approval', 'view-only')).toBe('blocked');
  });

  it('follows the global remote mode for keypad-only and operator-remote permissions', () => {
    expect(decideSubmissionOutcome('direct', 'keypad-only')).toBe('direct');
    expect(decideSubmissionOutcome('preview', 'operator-remote')).toBe('preview');
    expect(decideSubmissionOutcome('approval', 'keypad-only')).toBe('approval');
  });
});
