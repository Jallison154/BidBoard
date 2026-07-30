import { useState } from 'react';
import type { Bidder } from '../../types';
import { searchBiddersByText } from '../../lib/bidders';
import { downloadBidderListCsv } from '../../lib/exportCsv';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface BidderListPanelProps {
  bidders: Bidder[];
  eventName: string;
  locked: boolean;
  onAdd: (number: string, name: string, company?: string) => void;
  onUpdate: (id: string, patch: Partial<Pick<Bidder, 'number' | 'displayName' | 'company'>>) => void;
  onDelete: (id: string) => void;
  onOpenImport: () => void;
  onRemoveAll: () => void;
}

function AddBidderForm({ onAdd, onDone }: { onAdd: BidderListPanelProps['onAdd']; onDone: () => void }) {
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!number.trim()) return;
        onAdd(number, name, company || undefined);
        onDone();
      }}
      className="flex flex-col gap-2 rounded border border-white/10 bg-black/30 p-3"
    >
      <div className="flex gap-2">
        <input
          autoFocus
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Number"
          className="w-24 rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white outline-none focus:border-blue-500"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Display name"
          className="flex-1 rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white outline-none focus:border-blue-500"
        />
      </div>
      <input
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        placeholder="Company (optional)"
        className="rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white outline-none focus:border-blue-500"
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded px-2 py-1 text-xs text-neutral-400 hover:bg-white/5">
          Cancel
        </button>
        <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500">
          Add Bidder
        </button>
      </div>
    </form>
  );
}

function EditBidderRow({
  bidder,
  onUpdate,
  onDone,
}: {
  bidder: Bidder;
  onUpdate: BidderListPanelProps['onUpdate'];
  onDone: () => void;
}) {
  const [number, setNumber] = useState(bidder.number);
  const [name, setName] = useState(bidder.displayName);
  const [company, setCompany] = useState(bidder.company ?? '');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onUpdate(bidder.id, { number: number.trim(), displayName: name.trim(), company: company.trim() || undefined });
        onDone();
      }}
      className="flex flex-col gap-2 rounded border border-blue-500/40 bg-black/30 p-3"
    >
      <div className="flex gap-2">
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          className="w-24 rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white outline-none focus:border-blue-500"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white outline-none focus:border-blue-500"
        />
      </div>
      <input
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        placeholder="Company (optional)"
        className="rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white outline-none focus:border-blue-500"
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded px-2 py-1 text-xs text-neutral-400 hover:bg-white/5">
          Cancel
        </button>
        <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500">
          Save
        </button>
      </div>
    </form>
  );
}

export function BidderListPanel({
  bidders,
  eventName,
  locked,
  onAdd,
  onUpdate,
  onDelete,
  onOpenImport,
  onRemoveAll,
}: BidderListPanelProps) {
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmRemoveAll, setConfirmRemoveAll] = useState(false);

  const filtered = searchBiddersByText(bidders, query);
  const deleteTarget = bidders.find((b) => b.id === confirmDeleteId);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-neutral-900/60 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Bidder List ({bidders.length})
        </h3>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={onOpenImport}
            disabled={locked}
            className="rounded border border-white/15 px-2 py-1 font-semibold text-neutral-200 hover:bg-white/5 disabled:opacity-40"
          >
            Import
          </button>
          <button
            type="button"
            onClick={() => downloadBidderListCsv(bidders, eventName || 'bidboard-bidders')}
            className="rounded border border-white/15 px-2 py-1 font-semibold text-neutral-200 hover:bg-white/5"
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => setConfirmRemoveAll(true)}
            disabled={locked || bidders.length === 0}
            className="rounded border border-red-500/40 px-2 py-1 font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-40"
          >
            Remove All
          </button>
        </div>
      </div>

      {locked && (
        <p className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
          Bidder list editing is locked in Event Settings.
        </p>
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search bidders…"
        className="rounded border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
      />

      {!locked &&
        (adding ? (
          <AddBidderForm onAdd={onAdd} onDone={() => setAdding(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="self-start rounded border border-white/15 px-2 py-1 text-xs font-semibold text-neutral-300 hover:bg-white/5"
          >
            + Add Bidder
          </button>
        ))}

      <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
        {filtered.length === 0 && <p className="text-sm text-neutral-500">No bidders found.</p>}
        {filtered.map((b) =>
          editingId === b.id ? (
            <li key={b.id}>
              <EditBidderRow bidder={b} onUpdate={onUpdate} onDone={() => setEditingId(null)} />
            </li>
          ) : (
            <li
              key={b.id}
              className="flex items-center justify-between gap-2 rounded border border-white/5 px-3 py-2 hover:border-white/15"
            >
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white">{b.number}</span>
                  <span className="truncate text-sm text-neutral-300">{b.displayName || <em>no name</em>}</span>
                </div>
                {b.company && <span className="text-xs text-neutral-500">{b.company}</span>}
              </div>
              {!locked && (
                <div className="flex shrink-0 gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setEditingId(b.id)}
                    className="rounded border border-white/15 px-2 py-1 text-neutral-300 hover:bg-white/5"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(b.id)}
                    className="rounded border border-red-500/40 px-2 py-1 text-red-300 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ),
        )}
      </ul>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete bidder?"
          message={`Remove bidder #${deleteTarget.number} (${deleteTarget.displayName || 'no name'}) from the list?`}
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            onDelete(deleteTarget.id);
            setConfirmDeleteId(null);
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {confirmRemoveAll && (
        <ConfirmDialog
          title="Remove all bidders?"
          message="This clears the entire bidder list for this event. This cannot be undone."
          confirmLabel="Remove All"
          danger
          onConfirm={() => {
            onRemoveAll();
            setConfirmRemoveAll(false);
          }}
          onCancel={() => setConfirmRemoveAll(false)}
        />
      )}
    </div>
  );
}
