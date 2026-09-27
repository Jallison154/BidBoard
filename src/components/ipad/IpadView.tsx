import { useEffect, useMemo, useRef, useState } from 'react';
import { filterBidderNumber, normalizeBidderNumber } from '../../lib/normalize';
import { searchBiddersByText } from '../../lib/bidders';
import type { Bidder } from '../../types';
import type { RemoteCatalogBidder, RemoteCatalogHistoryEntry, RemoteCurrentBidder, SubmissionResult } from '../../shared/socketTypes';
import { Keypad } from '../remote/Keypad';
import { LayoutMenu } from '../remote/LayoutSwitch';
import type { CompanionLayout } from '../../lib/companionLayout';

type IpadTab = 'show' | 'bidders' | 'display';

const MAX_ENTRY = 12;

type EntryNotice = { number: string; message: string; tone: 'error' | 'wait' };

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function asBidders(bidders: RemoteCatalogBidder[]): Bidder[] {
  return bidders.map((bidder, index) => ({
    id: `${bidder.number}-${index}`,
    number: bidder.number,
    displayName: bidder.displayName,
    createdAt: 0,
    updatedAt: 0,
  }));
}

function matchesFor(bidders: RemoteCatalogBidder[], query: string): RemoteCatalogBidder[] {
  const target = normalizeBidderNumber(query);
  if (!target) return [];
  return bidders.filter((bidder) => normalizeBidderNumber(bidder.number) === target);
}

interface IpadViewProps {
  eventName: string;
  bidders: RemoteCatalogBidder[];
  history: RemoteCatalogHistoryEntry[];
  liveBidder: RemoteCurrentBidder | null;
  canSubmit: boolean;
  viewOnly: boolean;
  connectedLabel: string;
  connectedColor: string;
  layout: CompanionLayout;
  onLayout: (layout: CompanionLayout) => void;
  onShow: (bidderNumber: string, onResult: (result: SubmissionResult) => void) => void;
  onRedisplay: (entry: RemoteCatalogHistoryEntry) => void;
  onClear: () => void;
  allowLetterNumbers: boolean;
}

export function IpadView({
  eventName,
  bidders,
  history,
  liveBidder,
  canSubmit,
  viewOnly,
  connectedLabel,
  connectedColor,
  layout,
  onLayout,
  onShow,
  onRedisplay,
  onClear,
  allowLetterNumbers,
}: IpadViewProps) {
  const [tab, setTab] = useState<IpadTab>('show');
  const [digits, setDigits] = useState('');
  const [notice, setNotice] = useState<EntryNotice | null>(null);
  const [bidderQuery, setBidderQuery] = useState('');
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (allowLetterNumbers) return;
    setDigits((current) => {
      const next = filterBidderNumber(current, false);
      return next === current ? current : next;
    });
  }, [allowLetterNumbers]);

  const typed = digits.trim();
  const bidderRows = useMemo(() => searchBiddersByText(asBidders(bidders), bidderQuery), [bidders, bidderQuery]);

  const showingNotice = !typed && notice !== null;
  const bigNumber = showingNotice ? notice.number : liveBidder?.bidderNumber || '';
  const bigName = showingNotice ? '' : liveBidder?.displayName || '';

  const rejectEntry = (number: string, message: string) => {
    setDigits('');
    setNotice({ number, message, tone: 'error' });
  };

  const showNow = () => {
    if (!canSubmit || !typed) return;
    const bidderNumber = typed;
    const found = matchesFor(bidders, bidderNumber);
    if (bidders.length > 0 && found.length === 0) {
      rejectEntry(bidderNumber, 'That number was not found.');
      return;
    }
    if (found.length > 1) {
      rejectEntry(bidderNumber, 'More than one bidder uses that number.');
      return;
    }
    setDigits('');
    setNotice(null);
    onShow(bidderNumber, (result) => {
      if (result.status === 'unknown') {
        setNotice({ number: bidderNumber, message: 'That number was not found.', tone: 'error' });
      } else if (result.status === 'duplicate') {
        setNotice({ number: bidderNumber, message: 'More than one bidder uses that number.', tone: 'error' });
      } else if (result.status === 'pending') {
        setNotice({ number: bidderNumber, message: 'Waiting for the operator to approve this number.', tone: 'wait' });
      } else if (result.status === 'error' || result.status === 'rejected') {
        setNotice({
          number: bidderNumber,
          message: result.message ?? 'That number could not be shown.',
          tone: 'error',
        });
      }
    });
  };

  const redisplay = (entry: RemoteCatalogHistoryEntry) => {
    onRedisplay(entry);
    setTab('show');
    setDigits('');
    setNotice(null);
  };

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden overscroll-none bg-neutral-950 text-neutral-100"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2">
        <div className="flex min-w-0 flex-1 gap-2">
          {(
            [
              ['show', 'Keypad'],
              ['bidders', 'Bidders'],
              ['display', 'Full Screen'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`min-h-11 min-w-0 flex-1 truncate rounded-lg text-sm font-bold ${
                tab === id ? 'bg-blue-600 text-white' : 'bg-white/5 text-neutral-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <LayoutMenu layout={layout} label={connectedLabel} color={connectedColor} onChange={onLayout} />
      </div>

      {tab === 'show' && (
        <div className="flex min-h-0 flex-1">
            <div
              className="flex w-96 shrink-0 flex-col gap-3 border-r border-white/10 px-4 pt-3 pb-4"
            >
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-hidden px-1">
                <div className="w-full shrink-0 truncate text-center text-xs uppercase tracking-wide text-neutral-500">
                  {eventName || '\u00a0'}
                </div>
                <div
                  className={`flex min-h-0 w-full items-center justify-center overflow-hidden text-center text-7xl leading-tight font-black tracking-wide ${
                    showingNotice && notice.tone === 'error' ? 'text-red-400' : 'text-white'
                  }`}
                >
                  <span className="w-full truncate">{bigNumber || '—'}</span>
                </div>
                <div
                  className={`line-clamp-3 w-full shrink-0 text-center text-2xl leading-snug font-semibold ${
                    showingNotice
                      ? notice.tone === 'wait'
                        ? 'text-amber-300'
                        : 'text-red-300'
                      : 'text-neutral-200'
                  }`}
                >
                  {showingNotice ? notice.message : bigName || '\u00a0'}
                </div>
              </div>
              <input
                value={digits}
                onChange={(e) => {
                  setDigits(filterBidderNumber(e.target.value, allowLetterNumbers).slice(0, MAX_ENTRY));
                  setNotice(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    showNow();
                  }
                }}
                disabled={viewOnly}
                inputMode={allowLetterNumbers ? 'text' : 'numeric'}
                autoComplete="off"
                spellCheck={false}
                aria-label="Bidder number"
                placeholder="Number"
                className="h-24 w-full shrink-0 rounded-lg border border-white/15 bg-black/40 px-4 text-center text-5xl font-black tracking-wide text-white outline-none placeholder:text-neutral-600 focus:border-blue-500 disabled:opacity-50"
              />
              {viewOnly ? (
                <p className="flex h-16 shrink-0 items-center justify-center text-center text-sm text-neutral-500">
                  This remote is view-only. Ask the operator for keypad access.
                </p>
              ) : (
                <>
                  <Keypad
                    onDigit={(d) => {
                      setNotice(null);
                      setDigits((prev) => (prev.length < MAX_ENTRY ? prev + d : prev));
                    }}
                    onBackspace={() => {
                      setNotice(null);
                      setDigits((prev) => prev.slice(0, -1));
                    }}
                    onClearEntry={() => {
                      setDigits('');
                      setNotice(null);
                      onClear();
                    }}
                  />
                  <button
                    type="button"
                    onClick={showNow}
                    disabled={!canSubmit || !typed}
                    className="h-16 shrink-0 rounded-lg bg-blue-600 text-2xl font-extrabold text-white active:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-900 disabled:text-blue-300/50"
                  >
                    Show
                  </button>
                </>
              )}
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="flex h-10 shrink-0 items-center px-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Entered</h2>
              </div>
              {history.length === 0 ? (
                <p className="h-6 shrink-0 truncate px-4 text-sm leading-6 text-neutral-500">No one has been shown yet.</p>
              ) : (
                <ul data-allow-scroll className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-3 pb-3">
                  {history.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex h-16 shrink-0 items-center gap-3 overflow-hidden rounded-lg border border-white/10 px-3"
                    >
                      <span className="w-20 shrink-0 truncate text-lg font-bold text-white">{entry.bidderNumber}</span>
                      <span className="min-w-0 flex-1 truncate text-neutral-300">{entry.displayName || 'No name'}</span>
                      <span className="w-28 shrink-0 truncate text-xs text-neutral-500">{formatTime(entry.displayedAt)}</span>
                      <button
                        type="button"
                        onClick={() => redisplay(entry)}
                        disabled={!canSubmit}
                        className="h-10 w-28 shrink-0 rounded-md border border-blue-500/40 text-sm font-semibold text-blue-300 disabled:opacity-40"
                      >
                        Redisplay
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
        </div>
      )}

      {tab === 'bidders' && (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <input
            value={bidderQuery}
            onChange={(e) => setBidderQuery(e.target.value)}
            placeholder="Search bidders"
            aria-label="Search bidders"
            className="h-12 shrink-0 rounded-lg border border-white/15 bg-black/40 px-4 text-base text-white outline-none focus:border-blue-500"
          />
          {bidderRows.length === 0 ? (
            <p className="px-1 text-sm text-neutral-500">
              {bidders.length === 0 ? 'Bidder names appear when the operator is connected.' : 'No bidders match that search.'}
            </p>
          ) : (
            <ul data-allow-scroll className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain">
              {bidderRows.map((bidder) => (
                <li
                  key={bidder.id}
                  className="flex h-16 shrink-0 items-center gap-3 overflow-hidden rounded-lg border border-white/10 px-3"
                >
                  <span className="w-24 shrink-0 truncate text-lg font-bold text-white">{bidder.number}</span>
                  <span className="min-w-0 flex-1 truncate text-neutral-300">{bidder.displayName || 'No name'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setDigits(bidder.number.slice(0, MAX_ENTRY));
                      setNotice(null);
                      setTab('show');
                    }}
                    className="h-10 w-28 shrink-0 rounded-md border border-blue-500/40 text-sm font-semibold text-blue-300"
                  >
                    Preview
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'display' && (
        <div ref={stageRef} className="relative min-h-0 flex-1 bg-black">
          <iframe
            src="/?view=audience&embedded=1"
            title="Full screen display"
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
          <button
            type="button"
            onClick={() => void stageRef.current?.requestFullscreen()}
            className="absolute right-3 bottom-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white"
          >
            Full Screen
          </button>
        </div>
      )}
    </div>
  );
}
