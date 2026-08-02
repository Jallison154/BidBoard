import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { v4 as uuid } from 'uuid';
import type { Bidder, BidBoardEvent, BidBoardEventFile, DisplayPresetId, DisplaySettings, SafetySettings } from '../types';
import { STORAGE_KEYS, readJSON, writeJSON } from '../lib/storage';
import { DISPLAY_PRESETS, createEvent, makeBidder } from '../lib/events';
import { normalizeBidderNumber } from '../lib/normalize';

interface EventsState {
  events: Record<string, BidBoardEvent>;
  activeEventId: string | null;
}

interface AppContextValue {
  activeEvent: BidBoardEvent | null;
  allEvents: BidBoardEvent[];
  hasLaunched: boolean;
  markLaunched: () => void;
  newEvent: (name: string, withDemoBidders?: boolean) => string;
  switchEvent: (id: string) => void;
  renameEvent: (id: string, name: string) => void;
  duplicateEvent: (id: string) => void;
  deleteEvent: (id: string) => void;
  exportEvent: (id: string) => void;
  importEventFile: (file: File) => Promise<{ ok: true } | { ok: false; error: string }>;
  addBidder: (number: string, displayName: string, company?: string) => void;
  updateBidder: (id: string, patch: Partial<Pick<Bidder, 'number' | 'displayName' | 'company'>>) => void;
  deleteBidder: (id: string) => void;
  addBidders: (bidders: Bidder[]) => void;
  replaceBidders: (bidders: Bidder[]) => void;
  updateDisplaySettings: (patch: Partial<DisplaySettings>) => void;
  applyPreset: (presetId: Exclude<DisplayPresetId, 'custom'>) => void;
  updateSafety: (patch: Partial<SafetySettings>) => void;
  setAutoShow: (value: boolean) => void;
  setAutoClearEnabled: (value: boolean) => void;
  setAutoClearSeconds: (seconds: number) => void;
  addHistoryEntry: (
    bidderNumber: string,
    displayName: string,
    company: string | undefined,
    opts?: { force?: boolean },
  ) => void;
  clearHistory: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function loadInitialState(): EventsState {
  const events = readJSON<Record<string, BidBoardEvent>>(STORAGE_KEYS.events, {});
  const activeEventId = readJSON<string | null>(STORAGE_KEYS.activeEventId, null);
  return { events, activeEventId: activeEventId && events[activeEventId] ? activeEventId : null };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EventsState>(loadInitialState);
  const [hasLaunched, setHasLaunched] = useState(() => readJSON(STORAGE_KEYS.hasLaunched, false));

  useEffect(() => {
    writeJSON(STORAGE_KEYS.events, state.events);
  }, [state.events]);

  useEffect(() => {
    writeJSON(STORAGE_KEYS.activeEventId, state.activeEventId);
  }, [state.activeEventId]);

  const markLaunched = useCallback(() => {
    setHasLaunched(true);
    writeJSON(STORAGE_KEYS.hasLaunched, true);
  }, []);

  const patchActiveEvent = useCallback((updater: (event: BidBoardEvent) => Partial<BidBoardEvent>) => {
    setState((prev) => {
      if (!prev.activeEventId) return prev;
      const current = prev.events[prev.activeEventId];
      if (!current) return prev;
      const patch = updater(current);
      const updated: BidBoardEvent = { ...current, ...patch, updatedAt: Date.now() };
      return { ...prev, events: { ...prev.events, [updated.id]: updated } };
    });
  }, []);

  const newEvent = useCallback((name: string, withDemoBidders?: boolean) => {
    const event = createEvent(name, { withDemoBidders });
    setState((prev) => ({
      events: { ...prev.events, [event.id]: event },
      activeEventId: event.id,
    }));
    return event.id;
  }, []);

  const switchEvent = useCallback((id: string) => {
    setState((prev) => (prev.events[id] ? { ...prev, activeEventId: id } : prev));
  }, []);

  const renameEvent = useCallback((id: string, name: string) => {
    setState((prev) => {
      const event = prev.events[id];
      if (!event) return prev;
      return { ...prev, events: { ...prev.events, [id]: { ...event, name, updatedAt: Date.now() } } };
    });
  }, []);

  const duplicateEvent = useCallback((id: string) => {
    setState((prev) => {
      const source = prev.events[id];
      if (!source) return prev;
      const now = Date.now();
      const copy: BidBoardEvent = {
        ...source,
        id: uuid(),
        name: `${source.name} (Copy)`,
        createdAt: now,
        updatedAt: now,
      };
      return { events: { ...prev.events, [copy.id]: copy }, activeEventId: copy.id };
    });
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setState((prev) => {
      const events = { ...prev.events };
      delete events[id];
      const remainingIds = Object.keys(events);
      const activeEventId =
        prev.activeEventId === id ? (remainingIds[0] ?? null) : prev.activeEventId;
      return { events, activeEventId };
    });
  }, []);

  const exportEvent = useCallback(
    (id: string) => {
      const event = state.events[id];
      if (!event) return;
      const file: BidBoardEventFile = { fileFormat: 'bidboard-event', formatVersion: 1, event };
      const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event.name.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'event'}.bidboard.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [state.events],
  );

  const importEventFile = useCallback(async (file: File): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BidBoardEventFile;
      if (parsed.fileFormat !== 'bidboard-event' || !parsed.event) {
        return { ok: false, error: 'This file is not a valid BidBoard event export.' };
      }
      const now = Date.now();
      const event: BidBoardEvent = { ...parsed.event, id: uuid(), updatedAt: now };
      setState((prev) => ({ events: { ...prev.events, [event.id]: event }, activeEventId: event.id }));
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not read this file. Make sure it is a .bidboard.json export.' };
    }
  }, []);

  const addBidder = useCallback(
    (number: string, displayName: string, company?: string) => {
      patchActiveEvent((event) => ({ bidders: [...event.bidders, makeBidder(number, displayName, company)] }));
    },
    [patchActiveEvent],
  );

  const updateBidder = useCallback(
    (id: string, patch: Partial<Pick<Bidder, 'number' | 'displayName' | 'company'>>) => {
      patchActiveEvent((event) => ({
        bidders: event.bidders.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: Date.now() } : b)),
      }));
    },
    [patchActiveEvent],
  );

  const deleteBidder = useCallback(
    (id: string) => {
      patchActiveEvent((event) => ({ bidders: event.bidders.filter((b) => b.id !== id) }));
    },
    [patchActiveEvent],
  );

  const addBidders = useCallback(
    (bidders: Bidder[]) => {
      patchActiveEvent((event) => ({ bidders: [...event.bidders, ...bidders] }));
    },
    [patchActiveEvent],
  );

  const replaceBidders = useCallback(
    (bidders: Bidder[]) => {
      patchActiveEvent(() => ({ bidders }));
    },
    [patchActiveEvent],
  );

  const updateDisplaySettings = useCallback(
    (patch: Partial<DisplaySettings>) => {
      patchActiveEvent((event) => ({
        displaySettings: { ...event.displaySettings, ...patch, presetId: 'custom' },
      }));
    },
    [patchActiveEvent],
  );

  const applyPreset = useCallback(
    (presetId: Exclude<DisplayPresetId, 'custom'>) => {
      patchActiveEvent((event) => ({
        displaySettings: {
          ...DISPLAY_PRESETS[presetId],
          eventTitle: event.displaySettings.eventTitle,
          eventSubtitle: event.displaySettings.eventSubtitle,
          logoDataUrl: event.displaySettings.logoDataUrl,
        },
      }));
    },
    [patchActiveEvent],
  );

  const updateSafety = useCallback(
    (patch: Partial<SafetySettings>) => {
      patchActiveEvent((event) => ({ safety: { ...event.safety, ...patch } }));
    },
    [patchActiveEvent],
  );

  const setAutoShow = useCallback(
    (value: boolean) => {
      patchActiveEvent(() => ({ autoShow: value }));
    },
    [patchActiveEvent],
  );

  const setAutoClearEnabled = useCallback(
    (value: boolean) => {
      patchActiveEvent(() => ({ autoClearEnabled: value }));
    },
    [patchActiveEvent],
  );

  const setAutoClearSeconds = useCallback(
    (seconds: number) => {
      patchActiveEvent(() => ({ autoClearSeconds: Math.max(1, Math.round(seconds)) }));
    },
    [patchActiveEvent],
  );

  const addHistoryEntry = useCallback(
    (bidderNumber: string, displayName: string, company: string | undefined, opts?: { force?: boolean }) => {
      patchActiveEvent((event) => {
        const now = Date.now();
        const mostRecent = event.history[0];
        const isSameRecent =
          mostRecent && normalizeBidderNumber(mostRecent.bidderNumber) === normalizeBidderNumber(bidderNumber);
        if (!opts?.force && isSameRecent && now - mostRecent.displayedAt < 3000) {
          const updatedEntry = { ...mostRecent, displayName, company, displayedAt: now };
          return { history: [updatedEntry, ...event.history.slice(1)] };
        }
        const entry = { id: uuid(), bidderNumber, displayName, company, displayedAt: now };
        return { history: [entry, ...event.history].slice(0, 20) };
      });
    },
    [patchActiveEvent],
  );

  const clearHistory = useCallback(() => {
    patchActiveEvent(() => ({ history: [] }));
  }, [patchActiveEvent]);

  const activeEvent = state.activeEventId ? (state.events[state.activeEventId] ?? null) : null;
  const allEvents = useMemo(
    () => Object.values(state.events).sort((a, b) => b.updatedAt - a.updatedAt),
    [state.events],
  );

  const value: AppContextValue = {
    activeEvent,
    allEvents,
    hasLaunched,
    markLaunched,
    newEvent,
    switchEvent,
    renameEvent,
    duplicateEvent,
    deleteEvent,
    exportEvent,
    importEventFile,
    addBidder,
    updateBidder,
    deleteBidder,
    addBidders,
    replaceBidders,
    updateDisplaySettings,
    applyPreset,
    updateSafety,
    setAutoShow,
    setAutoClearEnabled,
    setAutoClearSeconds,
    addHistoryEntry,
    clearHistory,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
