import { useEffect, useMemo, useRef, useState } from 'react';
import { useRemoteConnection } from '../../hooks/useRemoteConnection';
import { searchBiddersByText } from '../../lib/bidders';
import { filterBidderNumber } from '../../lib/normalize';
import { resolveCompanionLayout, storeCompanionLayout, type CompanionLayout } from '../../lib/companionLayout';
import type { SubmissionResult } from '../../shared/socketTypes';
import type { Bidder } from '../../types';
import { IpadView } from '../ipad/IpadView';
import { ConnectScreen } from './ConnectScreen';
import { Keypad } from './Keypad';
import { LayoutMenu } from './LayoutSwitch';

type PhoneTab = 'show' | 'bidders';

const CLEAR_DIGITS_DELAY_MS = 2500;
const MAX_ENTRY = 12;

function statusLabel(status: string): { text: string; color: string } {
  switch (status) {
    case 'connected':
      return { text: 'Connected', color: 'bg-green-500' };
    case 'reconnecting':
      return { text: 'Reconnecting…', color: 'bg-amber-400' };
    case 'connecting':
      return { text: 'Connecting…', color: 'bg-amber-400' };
    default:
      return { text: 'Disconnected', color: 'bg-red-500' };
  }
}

function FeedbackBanner({ result }: { result: SubmissionResult }) {
  const styles: Record<SubmissionResult['status'], string> = {
    shown: 'border-green-500/40 bg-green-500/10 text-green-300',
    previewed: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
    pending: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    unknown: 'border-red-500/40 bg-red-500/10 text-red-300',
    duplicate: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    rejected: 'border-red-500/40 bg-red-500/10 text-red-300',
    error: 'border-red-500/40 bg-red-500/10 text-red-300',
  };

  return (
    <div className={`rounded-lg border px-4 py-3 text-center ${styles[result.status]}`}>
      {result.status === 'shown' && (
        <>
          <div className="text-5xl font-black">{result.bidderNumber}</div>
          <div className="text-2xl font-semibold">{result.displayName}</div>
        </>
      )}
      {result.status === 'previewed' && <div className="text-sm font-semibold">Staged in operator preview — waiting for Show</div>}
      {result.status === 'pending' && <div className="text-sm font-semibold">Waiting for operator approval…</div>}
      {result.status === 'unknown' && (
        <div className="text-sm font-semibold">
          Bidder {result.bidderNumber} was not found.
          <div className="font-normal opacity-80">The live display was not changed.</div>
        </div>
      )}
      {result.status === 'duplicate' && (
        <div className="text-sm font-semibold">
          Multiple bidders use number {result.bidderNumber}.
          <div className="font-normal opacity-80">Resolve this on the main operator screen.</div>
        </div>
      )}
      {result.status === 'rejected' && <div className="text-sm font-semibold">{result.message ?? 'The operator rejected this request.'}</div>}
      {result.status === 'error' && <div className="text-sm font-semibold">{result.message ?? 'Something went wrong.'}</div>}
    </div>
  );
}

function useLockPageScroll() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previous = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyInset: body.style.inset,
      bodyWidth: body.style.width,
      bodyHeight: body.style.height,
    };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.inset = '0';
    body.style.width = '100%';
    body.style.height = '100%';

    const blockPageMove = (event: TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        event.preventDefault();
        return;
      }
      const scroller = target.closest('[data-allow-scroll]');
      if (!(scroller instanceof HTMLElement) || scroller.scrollHeight <= scroller.clientHeight + 1) {
        event.preventDefault();
      }
    };
    document.addEventListener('touchmove', blockPageMove, { passive: false });

    return () => {
      html.style.overflow = previous.htmlOverflow;
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.bodyPosition;
      body.style.inset = previous.bodyInset;
      body.style.width = previous.bodyWidth;
      body.style.height = previous.bodyHeight;
      document.removeEventListener('touchmove', blockPageMove);
    };
  }, []);
}

export function RemoteApp() {
  const conn = useRemoteConnection();
  useLockPageScroll();
  const token = new URLSearchParams(window.location.search).get('token');
  const [layout, setLayout] = useState<CompanionLayout>(() => resolveCompanionLayout(window.location.search));

  const [digits, setDigits] = useState('');
  const [feedback, setFeedback] = useState<SubmissionResult | null>(null);
  const [phoneTab, setPhoneTab] = useState<PhoneTab>('show');
  const [bidderQuery, setBidderQuery] = useState('');
  const clearTimerRef = useRef<number | null>(null);
  const bidderRows = useMemo(
    () => searchBiddersByText(catalogAsBidders(conn.catalog.bidders), bidderQuery),
    [conn.catalog.bidders, bidderQuery],
  );
  const allowLetterNumbers = conn.catalog.allowLetterNumbers === true;

  useEffect(() => {
    if (allowLetterNumbers) return;
    setDigits((current) => {
      const next = filterBidderNumber(current, false);
      return next === current ? current : next;
    });
  }, [allowLetterNumbers]);

  const chooseLayout = (next: CompanionLayout) => {
    setLayout(next);
    storeCompanionLayout(next);
  };

  useEffect(() => {
    document.title = layout === 'ipad' ? 'BidBoard — Tablet' : 'BidBoard Remote';
    return () => {
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    };
  }, [layout]);

  if (!conn.authenticated) {
    return (
      <ConnectScreen
        status={conn.status}
        rejection={conn.rejection}
        deviceName={conn.deviceName}
        onSetDeviceName={conn.setDeviceName}
        hasToken={!!token}
        token={token}
        onConnect={conn.connect}
        layout={layout}
        onLayout={chooseLayout}
      />
    );
  }

  const status = statusLabel(conn.status);
  const viewOnly = conn.session?.permission === 'view-only';
  const canSubmit = digits.trim().length > 0 && !viewOnly;

  if (layout === 'ipad') {
    return (
      <IpadView
        eventName={conn.session?.eventName ?? ''}
        bidders={conn.catalog.bidders}
        history={conn.catalog.history}
        liveBidder={conn.liveBidder}
        canSubmit={!viewOnly}
        viewOnly={viewOnly}
        connectedLabel={status.text}
        connectedColor={status.color}
        layout={layout}
        onLayout={chooseLayout}
        onShow={conn.submitBidder}
        onRedisplay={(entry) => conn.submitBidder(entry.bidderNumber, () => {})}
        onClear={() => {
          if (conn.liveBidder) conn.requestClear();
        }}
        allowLetterNumbers={allowLetterNumbers}
      />
    );
  }

  const handleResult = (result: SubmissionResult) => {
    setFeedback(result);
    if (result.status === 'pending') return; // still waiting on the operator's decision
    if (result.status === 'shown' || result.status === 'previewed') {
      clearTimerRef.current = window.setTimeout(() => setFeedback(null), CLEAR_DIGITS_DELAY_MS);
    }
  };

  const handleShow = () => {
    if (!canSubmit) return;
    const bidderNumber = digits.trim();
    setDigits('');
    setFeedback(null);
    if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    conn.submitBidder(bidderNumber, handleResult);
  };

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden overscroll-none bg-neutral-950 text-neutral-100"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2">
        <div className="flex min-w-0 flex-1 gap-2">
          {(
            [
              ['show', 'Keypad'],
              ['bidders', 'Bidders'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPhoneTab(id)}
              className={`min-h-11 min-w-0 flex-1 rounded-lg text-sm font-bold ${
                phoneTab === id ? 'bg-blue-600 text-white' : 'bg-white/5 text-neutral-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <LayoutMenu layout={layout} label={status.text} color={status.color} onChange={chooseLayout} />
      </header>

      {phoneTab === 'bidders' ? (
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
              {conn.catalog.bidders.length === 0
                ? 'Bidder names appear when the operator is connected.'
                : 'No bidders match that search.'}
            </p>
          ) : (
            <ul data-allow-scroll className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain">
              {bidderRows.map((bidder) => (
                <li
                  key={bidder.id}
                  className="flex h-16 shrink-0 items-center gap-3 overflow-hidden rounded-lg border border-white/10 px-3"
                >
                  <span className="w-16 shrink-0 truncate text-lg font-bold text-white">{bidder.number}</span>
                  <span className="min-w-0 flex-1 truncate text-neutral-300">{bidder.displayName || 'No name'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setDigits(bidder.number.slice(0, MAX_ENTRY));
                      setFeedback(null);
                      setPhoneTab('show');
                    }}
                    disabled={viewOnly}
                    className="h-10 w-24 shrink-0 rounded-md border border-blue-500/40 text-sm font-semibold text-blue-300 disabled:opacity-40"
                  >
                    Preview
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4">
        <div className="h-6 shrink-0 truncate text-center text-xs leading-6 uppercase tracking-wide text-neutral-500">
          {conn.session?.eventName || 'BidBoard'}
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden text-center">
          {conn.liveBidder ? (
            <>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-red-400">Currently Live</div>
              <div className="w-full truncate text-7xl leading-none font-black tracking-wide text-white">
                {conn.liveBidder.bidderNumber}
              </div>
              <div className="mt-3 w-full truncate px-2 text-3xl leading-tight font-semibold text-neutral-100">
                {conn.liveBidder.displayName}
              </div>
            </>
          ) : (
            <div className="text-5xl font-black text-neutral-800">—</div>
          )}
        </div>

        {feedback && feedback.status !== 'shown' && <FeedbackBanner result={feedback} />}
      </div>
      )}

      {phoneTab === 'show' && (
      <div
        className="flex shrink-0 flex-col gap-3 border-t border-white/10 bg-neutral-950 px-4 pt-3 pb-4"
      >
        <input
          value={digits}
          onChange={(e) => setDigits(filterBidderNumber(e.target.value, allowLetterNumbers).slice(0, MAX_ENTRY))}
          disabled={conn.session?.permission === 'view-only'}
          inputMode={allowLetterNumbers ? 'text' : 'numeric'}
          autoComplete="off"
          spellCheck={false}
          aria-label="Bidder number"
          placeholder="Number"
          className="h-24 w-full rounded-lg border border-white/15 bg-black/40 px-4 text-center text-5xl font-black tracking-wide text-white outline-none placeholder:text-neutral-600 focus:border-blue-500 disabled:opacity-50"
        />

        {conn.session?.permission === 'view-only' ? (
          <p className="text-center text-sm text-neutral-500">
            This remote is view-only. Ask the operator for keypad access to submit bidders.
          </p>
        ) : (
          <>
            <Keypad
              onDigit={(d) => setDigits((prev) => (prev.length < MAX_ENTRY ? prev + d : prev))}
              onBackspace={() => setDigits((prev) => prev.slice(0, -1))}
              onClearEntry={() => {
                setDigits('');
                setFeedback(null);
                if (conn.liveBidder) conn.requestClear();
              }}
            />
            <button
              type="button"
              onClick={handleShow}
              disabled={!canSubmit}
              className="h-16 rounded-lg bg-blue-600 text-2xl font-extrabold text-white active:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-900 disabled:text-blue-300/50"
            >
              Show
            </button>
          </>
        )}
      </div>
      )}
    </div>
  );
}

function catalogAsBidders(bidders: { number: string; displayName: string }[]): Bidder[] {
  return bidders.map((bidder, index) => ({
    id: `${bidder.number}-${index}`,
    number: bidder.number,
    displayName: bidder.displayName,
    createdAt: 0,
    updatedAt: 0,
  }));
}
