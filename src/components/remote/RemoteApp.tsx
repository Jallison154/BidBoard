import { useEffect, useRef, useState } from 'react';
import logo from '../../assets/bidboard-logo.png';
import { useRemoteConnection } from '../../hooks/useRemoteConnection';
import type { SubmissionResult } from '../../shared/socketTypes';
import { ConnectScreen } from './ConnectScreen';
import { Keypad } from './Keypad';
import { HoldToConfirmButton } from './HoldToConfirmButton';

const CLEAR_DIGITS_DELAY_MS = 2500;
const MAX_DIGITS = 12;

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
          <div className="text-2xl font-extrabold">{result.bidderNumber}</div>
          <div className="text-sm">{result.displayName}</div>
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

export function RemoteApp() {
  const conn = useRemoteConnection();
  const token = new URLSearchParams(window.location.search).get('token');

  const [digits, setDigits] = useState('');
  const [feedback, setFeedback] = useState<SubmissionResult | null>(null);
  const [awaiting, setAwaiting] = useState(false);
  const clearTimerRef = useRef<number | null>(null);

  useEffect(() => {
    document.title = 'BidBoard Remote';
    return () => {
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    };
  }, []);

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
      />
    );
  }

  const status = statusLabel(conn.status);
  const canSubmit = digits.length > 0 && !awaiting && conn.session?.permission !== 'view-only';
  const canClear =
    conn.session?.permission === 'operator-remote' && conn.session?.allowRemoteClear && conn.status === 'connected';

  const handleResult = (result: SubmissionResult) => {
    setFeedback(result);
    if (result.status === 'pending') return; // still waiting on the operator's decision
    setAwaiting(false);
    if (result.status === 'shown' || result.status === 'previewed') {
      clearTimerRef.current = window.setTimeout(() => {
        setDigits('');
        setFeedback(null);
      }, CLEAR_DIGITS_DELAY_MS);
    }
  };

  const handleShow = () => {
    if (!canSubmit) return;
    setFeedback(null);
    setAwaiting(true);
    conn.submitBidder(digits, handleResult);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col gap-4 bg-neutral-950 p-4 text-neutral-100" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))', paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
      <header className="flex items-center justify-between">
        <img src={logo} alt="BidBoard" className="h-7 w-auto" />
        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
          <span className={`h-2 w-2 rounded-full ${status.color}`} />
          {status.text}
        </div>
      </header>

      <div className="text-center text-xs uppercase tracking-wide text-neutral-500">{conn.session?.eventName || 'BidBoard'}</div>

      {conn.liveBidder && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wide text-red-400">Currently Live</div>
          <div className="text-xl font-extrabold text-white">{conn.liveBidder.bidderNumber}</div>
          <div className="text-sm text-neutral-300">{conn.liveBidder.displayName}</div>
        </div>
      )}

      {feedback && <FeedbackBanner result={feedback} />}

      <div className="flex flex-1 flex-col justify-center gap-4">
        <div className="rounded-lg border border-white/15 bg-black/40 px-4 py-6 text-center text-5xl font-black tracking-wide text-white">
          {digits || <span className="text-neutral-600">0</span>}
        </div>

        {conn.session?.permission === 'view-only' ? (
          <p className="text-center text-sm text-neutral-500">
            This remote is view-only. Ask the operator for keypad access to submit bidders.
          </p>
        ) : (
          <>
            <Keypad
              disabled={awaiting}
              onDigit={(d) => setDigits((prev) => (prev.length < MAX_DIGITS ? prev + d : prev))}
              onBackspace={() => setDigits((prev) => prev.slice(0, -1))}
              onClearEntry={() => {
                setDigits('');
                setFeedback(null);
              }}
            />
            <button
              type="button"
              onClick={handleShow}
              disabled={!canSubmit}
              className="min-h-16 rounded-lg bg-blue-600 text-2xl font-extrabold text-white active:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-900 disabled:text-blue-300/50"
            >
              {awaiting ? 'Waiting…' : 'Show'}
            </button>
          </>
        )}

        {canClear && <HoldToConfirmButton label="Clear Display" onConfirm={conn.requestClear} />}
      </div>
    </div>
  );
}
