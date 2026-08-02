import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useOperatorChannel } from './useDisplayChannel';
import { findBidders, findDuplicateNumbers } from '../lib/bidders';
import { normalizeBidderNumber } from '../lib/normalize';
import { defaultDisplaySettings } from '../lib/events';
import type { AudienceCurrentBidder, Bidder, HistoryEntry } from '../types';

export type ConsoleStatus =
  | { kind: 'idle' }
  | { kind: 'preview'; bidder: Bidder; overrideName: string; overrideCompany: string }
  | { kind: 'duplicates'; query: string; matches: Bidder[] }
  | { kind: 'unknown'; query: string; nameInput: string; companyInput: string };

export function useOperatorConsole() {
  const app = useApp();
  const { activeEvent } = app;
  const bidders = useMemo(() => activeEvent?.bidders ?? [], [activeEvent]);
  const safety = activeEvent?.safety;
  const autoShow = activeEvent?.autoShow ?? false;
  const autoClearEnabled = activeEvent?.autoClearEnabled ?? false;
  const autoClearSeconds = activeEvent?.autoClearSeconds ?? 20;
  const settings = activeEvent?.displaySettings ?? defaultDisplaySettings();

  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<ConsoleStatus>({ kind: 'idle' });
  const [liveBidder, setLiveBidder] = useState<AudienceCurrentBidder | null>(null);
  const [historyCursor, setHistoryCursor] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const audienceWindowRef = useRef<Window | null>(null);

  const channel = useOperatorChannel({ settings, current: liveBidder });
  const { pushSettings: pushSettingsToChannel } = channel;
  const duplicateGroups = useMemo(() => findDuplicateNumbers(bidders), [bidders]);

  useEffect(() => {
    pushSettingsToChannel(settings);
  }, [settings, pushSettingsToChannel]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const resetConsole = useCallback(() => {
    setStatus({ kind: 'idle' });
    setInputValue('');
    setHistoryCursor(-1);
  }, []);

  const commitShow = useCallback(
    (number: string, name: string, company: string | undefined, opts?: { force?: boolean }) => {
      channel.showBidder(number, name, company);
      app.addHistoryEntry(number, name, company, opts);
      setLiveBidder({ bidderNumber: number, displayName: name, company });
    },
    [app, channel],
  );

  const populateFromQuery = useCallback(
    (query: string) => {
      const matches = findBidders(bidders, query);
      if (matches.length === 0) {
        setStatus({ kind: 'unknown', query, nameInput: '', companyInput: '' });
        return;
      }
      if (matches.length > 1) {
        setStatus({ kind: 'duplicates', query, matches });
        return;
      }
      const bidder = matches[0];
      setStatus({ kind: 'preview', bidder, overrideName: bidder.displayName, overrideCompany: bidder.company ?? '' });
    },
    [bidders],
  );

  const handleLookup = useCallback(() => {
    const query = inputValue.trim();
    if (!query) return;
    populateFromQuery(query);
  }, [inputValue, populateFromQuery]);

  const showPreviewNow = useCallback(() => {
    if (status.kind !== 'preview') return;
    commitShow(status.bidder.number, status.overrideName.trim() || status.bidder.displayName, status.overrideCompany.trim() || status.bidder.company);
    resetConsole();
    focusInput();
  }, [status, commitShow, resetConsole, focusInput]);

  const showUnknownNow = useCallback(() => {
    if (status.kind !== 'unknown') return;
    commitShow(status.query, status.nameInput.trim(), status.companyInput.trim() || undefined);
    resetConsole();
    focusInput();
  }, [status, commitShow, resetConsole, focusInput]);

  const handleEnterKey = useCallback(() => {
    const query = inputValue.trim();
    if (!query) {
      if (status.kind === 'preview') showPreviewNow();
      return;
    }

    if (autoShow) {
      const matches = findBidders(bidders, query);
      const blockedByDuplicateSafety = safety?.disableAutoShowOnDuplicates && duplicateGroups.has(normalizeBidderNumber(query));
      if (matches.length === 1 && !blockedByDuplicateSafety) {
        commitShow(matches[0].number, matches[0].displayName, matches[0].company);
        resetConsole();
        focusInput();
        return;
      }
      populateFromQuery(query);
      return;
    }

    if (status.kind === 'preview' && normalizeBidderNumber(status.bidder.number) === normalizeBidderNumber(query)) {
      showPreviewNow();
      return;
    }
    populateFromQuery(query);
  }, [inputValue, status, autoShow, bidders, safety, duplicateGroups, commitShow, resetConsole, focusInput, populateFromQuery, showPreviewNow]);

  const selectMatch = useCallback((bidder: Bidder) => {
    setStatus({ kind: 'preview', bidder, overrideName: bidder.displayName, overrideCompany: bidder.company ?? '' });
  }, []);

  const setOverrideName = useCallback((name: string) => {
    setStatus((prev) => (prev.kind === 'preview' ? { ...prev, overrideName: name } : prev));
  }, []);

  const setOverrideCompany = useCallback((company: string) => {
    setStatus((prev) => (prev.kind === 'preview' ? { ...prev, overrideCompany: company } : prev));
  }, []);

  const setUnknownName = useCallback((name: string) => {
    setStatus((prev) => (prev.kind === 'unknown' ? { ...prev, nameInput: name } : prev));
  }, []);

  const setUnknownCompany = useCallback((company: string) => {
    setStatus((prev) => (prev.kind === 'unknown' ? { ...prev, companyInput: company } : prev));
  }, []);

  const handleEscape = useCallback(() => {
    resetConsole();
    focusInput();
  }, [resetConsole, focusInput]);

  const clearDisplayNow = useCallback(() => {
    channel.clearDisplay();
    setLiveBidder(null);
    focusInput();
  }, [channel, focusInput]);

  useEffect(() => {
    if (!autoClearEnabled || !liveBidder) return;
    const timeoutId = window.setTimeout(() => {
      clearDisplayNow();
    }, autoClearSeconds * 1000);
    return () => window.clearTimeout(timeoutId);
  }, [liveBidder, autoClearEnabled, autoClearSeconds, clearDisplayNow]);

  const redisplay = useCallback(
    (entry: HistoryEntry) => {
      commitShow(entry.bidderNumber, entry.displayName, entry.company, { force: true });
      focusInput();
    },
    [commitShow, focusInput],
  );

  const cycleHistory = useCallback(
    (direction: 1 | -1) => {
      const history = activeEvent?.history ?? [];
      if (history.length === 0) return;
      const nextCursor = Math.min(Math.max(historyCursor + direction, 0), history.length - 1);
      setHistoryCursor(nextCursor);
      const entry = history[nextCursor];
      const found = findBidders(bidders, entry.bidderNumber)[0];
      if (found) {
        setStatus({ kind: 'preview', bidder: found, overrideName: entry.displayName, overrideCompany: entry.company ?? '' });
      } else {
        setStatus({ kind: 'unknown', query: entry.bidderNumber, nameInput: entry.displayName, companyInput: entry.company ?? '' });
      }
      setInputValue(entry.bidderNumber);
    },
    [activeEvent, historyCursor, bidders],
  );

  const lookupForRemote = useCallback(
    (query: string): { result: 'unique'; displayName: string; company?: string } | { result: 'duplicate' } | { result: 'unknown' } => {
      const blockedByDuplicateSafety = safety?.disableAutoShowOnDuplicates && duplicateGroups.has(normalizeBidderNumber(query));
      const matches = findBidders(bidders, query);
      if (matches.length === 0) return { result: 'unknown' };
      if (matches.length > 1 || blockedByDuplicateSafety) return { result: 'duplicate' };
      return { result: 'unique', displayName: matches[0].displayName, company: matches[0].company };
    },
    [bidders, safety, duplicateGroups],
  );

  const applyRemoteShow = useCallback(
    (bidderNumber: string, displayName: string, company: string | undefined) => {
      commitShow(bidderNumber, displayName, company);
    },
    [commitShow],
  );

  const applyRemotePreview = useCallback(
    (bidderNumber: string, displayName: string, company: string | undefined) => {
      const existing = findBidders(bidders, bidderNumber)[0];
      const bidder: Bidder = existing ?? {
        id: `remote-${bidderNumber}`,
        number: bidderNumber,
        displayName,
        company,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setStatus({
        kind: 'preview',
        bidder,
        overrideName: displayName || bidder.displayName,
        overrideCompany: company ?? bidder.company ?? '',
      });
    },
    [bidders],
  );

  const applyRemoteClear = useCallback(() => {
    clearDisplayNow();
  }, [clearDisplayNow]);

  const openAudienceWindow = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}?view=audience`;
    if (audienceWindowRef.current && !audienceWindowRef.current.closed) {
      audienceWindowRef.current.focus();
      return;
    }
    const win = window.open(url, 'bidboard-audience');
    audienceWindowRef.current = win;
    win?.focus();
  }, []);

  return {
    inputRef,
    inputValue,
    setInputValue,
    status,
    liveBidder,
    connected: channel.connected,
    channelSupported: channel.supported,
    resolution: channel.resolution,
    handleLookup,
    handleEnterKey,
    handleEscape,
    selectMatch,
    setOverrideName,
    setOverrideCompany,
    setUnknownName,
    setUnknownCompany,
    showPreviewNow,
    showUnknownNow,
    clearDisplayNow,
    redisplay,
    cycleHistory,
    focusInput,
    openAudienceWindow,
    lookupForRemote,
    applyRemoteShow,
    applyRemotePreview,
    applyRemoteClear,
  };
}

export type OperatorConsole = ReturnType<typeof useOperatorConsole>;
