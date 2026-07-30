import { useCallback, useEffect, useRef, useState } from 'react';
import { CONNECTION_TIMEOUT_MS, DisplayChannel, HEARTBEAT_INTERVAL_MS } from '../lib/channel';
import type { AudienceCurrentBidder, DisplaySettings } from '../types';

export interface OperatorChannelState {
  settings: DisplaySettings;
  current: AudienceCurrentBidder | null;
}

export interface DisplayResolution {
  width: number;
  height: number;
}

export function useOperatorChannel(state: OperatorChannelState) {
  const stateRef = useRef(state);
  stateRef.current = state;
  const channelRef = useRef<DisplayChannel | null>(null);
  const lastSeenRef = useRef<number>(0);
  const [connected, setConnected] = useState(false);
  const [supported, setSupported] = useState(true);
  const [resolution, setResolution] = useState<DisplayResolution | null>(null);

  useEffect(() => {
    const channel = new DisplayChannel();
    channelRef.current = channel;
    setSupported(channel.isSupported);

    const unsubscribe = channel.subscribe((message) => {
      if (message.kind === 'hello' || message.kind === 'heartbeat') {
        // Only a genuine external audience window counts toward the connection
        // indicator — the embedded live-output preview identifies itself
        // separately so it can't make a closed audience window look connected.
        if (message.from === 'audience') {
          lastSeenRef.current = Date.now();
          setConnected(true);
          if (message.kind === 'heartbeat' && message.resolution) {
            setResolution(message.resolution);
          }
        }
        if (message.kind === 'hello') {
          channel.send({
            kind: 'state-sync',
            settings: stateRef.current.settings,
            current: stateRef.current.current,
            ts: Date.now(),
          });
        }
      }
    });

    const interval = window.setInterval(() => {
      if (lastSeenRef.current === 0) return;
      if (Date.now() - lastSeenRef.current > CONNECTION_TIMEOUT_MS) {
        setConnected(false);
        setResolution(null);
      }
    }, 1000);

    return () => {
      unsubscribe();
      window.clearInterval(interval);
      channel.close();
    };
  }, []);

  const showBidder = useCallback((bidderNumber: string, displayName: string, company?: string) => {
    channelRef.current?.send({ kind: 'show', bidderNumber, displayName, company, ts: Date.now() });
  }, []);

  const clearDisplay = useCallback(() => {
    channelRef.current?.send({ kind: 'clear', ts: Date.now() });
  }, []);

  const pushSettings = useCallback((settings: DisplaySettings) => {
    channelRef.current?.send({ kind: 'settings', settings, ts: Date.now() });
  }, []);

  return { connected, supported, resolution, showBidder, clearDisplay, pushSettings };
}

export type AudienceStage = 'waiting' | 'bidder' | 'cleared';

export function useAudienceChannel(initialSettings: DisplaySettings, role: 'audience' | 'audience-preview' = 'audience') {
  const [settings, setSettings] = useState(initialSettings);
  const [current, setCurrent] = useState<AudienceCurrentBidder | null>(null);
  const [stage, setStage] = useState<AudienceStage>('waiting');

  useEffect(() => {
    const channel = new DisplayChannel();
    channel.send({ kind: 'hello', from: role, ts: Date.now() });

    const heartbeat = window.setInterval(() => {
      channel.send({
        kind: 'heartbeat',
        from: role,
        ts: Date.now(),
        resolution: { width: window.innerWidth, height: window.innerHeight },
      });
    }, HEARTBEAT_INTERVAL_MS);

    const unsubscribe = channel.subscribe((message) => {
      switch (message.kind) {
        case 'show':
          setCurrent({
            bidderNumber: message.bidderNumber,
            displayName: message.displayName,
            company: message.company,
          });
          setStage('bidder');
          break;
        case 'clear':
          setCurrent(null);
          setStage('cleared');
          break;
        case 'settings':
          setSettings(message.settings);
          break;
        case 'state-sync':
          setSettings(message.settings);
          setCurrent(message.current);
          setStage(message.current ? 'bidder' : 'waiting');
          break;
      }
    });

    return () => {
      unsubscribe();
      window.clearInterval(heartbeat);
      channel.close();
    };
  }, [role]);

  return { settings, current, stage };
}
