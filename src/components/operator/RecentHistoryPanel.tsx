import { useState } from 'react';
import type { HistoryEntry } from '../../types';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface RecentHistoryPanelProps {
  history: HistoryEntry[];
  onRedisplay: (entry: HistoryEntry) => void;
  onClearHistory: () => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function RecentHistoryPanel({ history, onRedisplay, onClearHistory }: RecentHistoryPanelProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-neutral-900/60 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Recently Displayed</h3>
        {history.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="text-xs text-neutral-500 hover:text-red-400"
          >
            Clear History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing displayed yet.</p>
      ) : (
        <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {history.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-2 rounded border border-white/5 px-3 py-2 hover:border-white/15"
            >
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white">{entry.bidderNumber}</span>
                  <span className="truncate text-sm text-neutral-300">{entry.displayName || <em>no name</em>}</span>
                </div>
                <span className="text-xs text-neutral-500">{formatTime(entry.displayedAt)}</span>
              </div>
              <button
                type="button"
                onClick={() => onRedisplay(entry)}
                className="shrink-0 rounded border border-blue-500/40 px-2 py-1 text-xs font-semibold text-blue-300 hover:bg-blue-500/10"
              >
                Redisplay
              </button>
            </li>
          ))}
        </ul>
      )}

      {confirmClear && (
        <ConfirmDialog
          title="Clear recent history?"
          message="This removes the recently-displayed list. It does not affect the bidder list or the audience display."
          confirmLabel="Clear History"
          danger
          onConfirm={() => {
            onClearHistory();
            setConfirmClear(false);
          }}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </div>
  );
}
