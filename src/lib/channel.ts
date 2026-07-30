import type { DisplayChannelMessage } from '../types';

export const CHANNEL_NAME = 'bidboard-display-v1';
export const HEARTBEAT_INTERVAL_MS = 2000;
export const CONNECTION_TIMEOUT_MS = 5500;

type Handler = (message: DisplayChannelMessage) => void;

/** Thin wrapper around BroadcastChannel so operator/audience windows share one
 * typed send/subscribe API. Falls back gracefully (no-op) if BroadcastChannel
 * is unavailable in the runtime. */
export class DisplayChannel {
  private channel: BroadcastChannel | null;
  private handlers = new Set<Handler>();

  constructor() {
    this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;
    this.channel?.addEventListener('message', (event: MessageEvent<DisplayChannelMessage>) => {
      for (const handler of this.handlers) handler(event.data);
    });
  }

  get isSupported(): boolean {
    return this.channel !== null;
  }

  send(message: DisplayChannelMessage): void {
    this.channel?.postMessage(message);
  }

  subscribe(handler: Handler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  close(): void {
    this.channel?.close();
    this.handlers.clear();
  }
}
