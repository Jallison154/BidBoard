import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppProvider, useApp } from '../AppContext';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => <AppProvider>{children}</AppProvider>;

beforeEach(() => {
  localStorage.clear();
});

describe('event lifecycle', () => {
  it('creates a new event and makes it active', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.newEvent('Spring Gala', false);
    });

    expect(result.current.activeEvent?.name).toBe('Spring Gala');
    expect(result.current.activeEvent?.bidders).toHaveLength(0);
  });

  it('seeds demo bidders when requested', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.newEvent('Demo Event', true);
    });

    expect(result.current.activeEvent?.bidders.length).toBeGreaterThan(0);
  });

  it('persists events to localStorage and reloads them on next mount', () => {
    const { result, unmount } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.newEvent('Persisted Event', false);
      result.current.addBidder('254', 'John & Sarah Smith');
    });

    const eventId = result.current.activeEvent!.id;
    unmount();

    const { result: result2 } = renderHook(() => useApp(), { wrapper });
    expect(result2.current.activeEvent?.id).toBe(eventId);
    expect(result2.current.activeEvent?.bidders).toHaveLength(1);
    expect(result2.current.activeEvent?.bidders[0].number).toBe('254');
  });

  it('duplicates an event with a new id and copy suffix', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.newEvent('Original', false);
      result.current.addBidder('1', 'Someone');
    });
    const originalId = result.current.activeEvent!.id;

    act(() => {
      result.current.duplicateEvent(originalId);
    });

    expect(result.current.activeEvent?.id).not.toBe(originalId);
    expect(result.current.activeEvent?.name).toBe('Original (Copy)');
    expect(result.current.activeEvent?.bidders).toHaveLength(1);
  });

  it('deletes an event and falls back to another remaining event', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.newEvent('Event A', false);
    });
    const idA = result.current.activeEvent!.id;

    act(() => {
      result.current.newEvent('Event B', false);
    });

    act(() => {
      result.current.deleteEvent(result.current.activeEvent!.id);
    });

    expect(result.current.activeEvent?.id).toBe(idA);
  });
});

describe('recent history behavior', () => {
  it('adds a history entry for each displayed bidder, most recent first', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.newEvent('Event', false);
    });

    act(() => {
      result.current.addHistoryEntry('101', 'Alex Johnson', undefined);
    });
    act(() => {
      result.current.addHistoryEntry('254', 'John & Sarah Smith', undefined);
    });

    const history = result.current.activeEvent!.history;
    expect(history).toHaveLength(2);
    expect(history[0].bidderNumber).toBe('254');
  });

  it('collapses accidental rapid repeats of the same bidder into one entry', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.newEvent('Event', false);
    });

    act(() => {
      result.current.addHistoryEntry('101', 'Alex Johnson', undefined);
    });
    act(() => {
      result.current.addHistoryEntry('101', 'Alex Johnson', undefined);
    });

    expect(result.current.activeEvent!.history).toHaveLength(1);
  });

  it('allows an intentional forced redisplay to still register', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.newEvent('Event', false);
    });

    act(() => {
      result.current.addHistoryEntry('101', 'Alex Johnson', undefined);
    });
    act(() => {
      result.current.addHistoryEntry('101', 'Alex Johnson', undefined, { force: true });
    });

    expect(result.current.activeEvent!.history).toHaveLength(2);
  });

  it('caps history at 20 entries', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.newEvent('Event', false);
    });

    for (let i = 0; i < 25; i++) {
      act(() => {
        result.current.addHistoryEntry(String(i), `Bidder ${i}`, undefined, { force: true });
      });
    }

    expect(result.current.activeEvent!.history).toHaveLength(20);
  });

  it('clears history without affecting the bidder list', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.newEvent('Event', true);
      result.current.addHistoryEntry('101', 'Alex Johnson', undefined);
    });

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.activeEvent!.history).toHaveLength(0);
    expect(result.current.activeEvent!.bidders.length).toBeGreaterThan(0);
  });
});

describe('auto-clear settings', () => {
  it('defaults new events to auto-clear disabled with a 20 second delay', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.newEvent('Event', false);
    });
    expect(result.current.activeEvent!.autoClearEnabled).toBe(false);
    expect(result.current.activeEvent!.autoClearSeconds).toBe(20);
  });

  it('toggles auto-clear on and off', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.newEvent('Event', false);
    });

    act(() => {
      result.current.setAutoClearEnabled(true);
    });
    expect(result.current.activeEvent!.autoClearEnabled).toBe(true);

    act(() => {
      result.current.setAutoClearEnabled(false);
    });
    expect(result.current.activeEvent!.autoClearEnabled).toBe(false);
  });

  it('updates the auto-clear delay, rounding and clamping to at least 1 second', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.newEvent('Event', false);
    });

    act(() => {
      result.current.setAutoClearSeconds(45.6);
    });
    expect(result.current.activeEvent!.autoClearSeconds).toBe(46);

    act(() => {
      result.current.setAutoClearSeconds(-5);
    });
    expect(result.current.activeEvent!.autoClearSeconds).toBe(1);
  });
});
