import { describe, expect, it, vi } from 'vitest';
import { DisplayChannel } from '../channel';

describe('DisplayChannel', () => {
  it('delivers messages sent from one instance to another (operator -> audience sync)', async () => {
    const operator = new DisplayChannel();
    const audience = new DisplayChannel();
    const received = vi.fn();
    audience.subscribe(received);

    operator.send({ kind: 'show', bidderNumber: '254', displayName: 'John & Sarah Smith', ts: Date.now() });

    await vi.waitFor(() => {
      expect(received).toHaveBeenCalledTimes(1);
    });
    expect(received.mock.calls[0][0]).toMatchObject({ kind: 'show', bidderNumber: '254' });

    operator.close();
    audience.close();
  });

  it('stops delivering messages after unsubscribe', async () => {
    const a = new DisplayChannel();
    const b = new DisplayChannel();
    const received = vi.fn();
    const unsubscribe = b.subscribe(received);
    unsubscribe();

    a.send({ kind: 'clear', ts: Date.now() });
    await new Promise((r) => setTimeout(r, 20));
    expect(received).not.toHaveBeenCalled();

    a.close();
    b.close();
  });
});
