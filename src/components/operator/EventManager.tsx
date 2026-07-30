import { useState } from 'react';
import type { BidBoardEvent } from '../../types';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface EventManagerProps {
  events: BidBoardEvent[];
  activeEventId: string | null;
  onNew: (name: string, withDemoBidders: boolean) => void;
  onSwitch: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
  onImportFile: (file: File) => Promise<{ ok: true } | { ok: false; error: string }>;
  onClose: () => void;
}

export function EventManager({
  events,
  activeEventId,
  onNew,
  onSwitch,
  onRename,
  onDuplicate,
  onDelete,
  onExport,
  onImportFile,
  onClose,
}: EventManagerProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWithDemo, setNewWithDemo] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const deleteTarget = events.find((e) => e.id === confirmDeleteId);

  return (
    <Modal title="Events" onClose={onClose} wide>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500"
          >
            New Event
          </button>
          <label className="cursor-pointer rounded border border-white/15 px-3 py-1.5 text-sm font-semibold text-neutral-200 hover:bg-white/5">
            Import Event File
            <input
              type="file"
              accept=".json,.bidboard.json,application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const result = await onImportFile(file);
                setImportError(result.ok ? null : result.error);
                e.target.value = '';
              }}
            />
          </label>
        </div>

        {importError && <p className="text-sm text-red-400">{importError}</p>}

        {creating && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newName.trim()) return;
              onNew(newName.trim(), newWithDemo);
              setCreating(false);
              setNewName('');
              setNewWithDemo(false);
            }}
            className="flex flex-col gap-2 rounded border border-white/10 bg-black/30 p-3"
          >
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Event name"
              className="rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white outline-none focus:border-blue-500"
            />
            <label className="flex items-center gap-2 text-xs text-neutral-300">
              <input type="checkbox" checked={newWithDemo} onChange={(e) => setNewWithDemo(e.target.checked)} />
              Start with demo bidder list
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCreating(false)} className="rounded px-2 py-1 text-xs text-neutral-400 hover:bg-white/5">
                Cancel
              </button>
              <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500">
                Create
              </button>
            </div>
          </form>
        )}

        <ul className="flex flex-col gap-1">
          {events.length === 0 && <p className="text-sm text-neutral-500">No events yet.</p>}
          {events.map((event) => (
            <li
              key={event.id}
              className={`flex items-center justify-between gap-2 rounded border px-3 py-2 ${
                event.id === activeEventId ? 'border-blue-500 bg-blue-500/10' : 'border-white/10'
              }`}
            >
              {renamingId === event.id ? (
                <form
                  className="flex flex-1 gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (renameValue.trim()) onRename(event.id, renameValue.trim());
                    setRenamingId(null);
                  }}
                >
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="flex-1 rounded border border-white/15 bg-black/40 px-2 py-1 text-sm text-white outline-none focus:border-blue-500"
                  />
                  <button type="submit" className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-500">
                    Save
                  </button>
                </form>
              ) : (
                <button type="button" onClick={() => onSwitch(event.id)} className="min-w-0 flex-1 text-left">
                  <div className="truncate font-semibold text-white">{event.name}</div>
                  <div className="text-xs text-neutral-500">
                    {event.bidders.length} bidders · updated {new Date(event.updatedAt).toLocaleString()}
                  </div>
                </button>
              )}

              {renamingId !== event.id && (
                <div className="flex shrink-0 gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(event.id);
                      setRenameValue(event.name);
                    }}
                    className="rounded border border-white/15 px-2 py-1 text-neutral-300 hover:bg-white/5"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicate(event.id)}
                    className="rounded border border-white/15 px-2 py-1 text-neutral-300 hover:bg-white/5"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => onExport(event.id)}
                    className="rounded border border-white/15 px-2 py-1 text-neutral-300 hover:bg-white/5"
                  >
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(event.id)}
                    className="rounded border border-red-500/40 px-2 py-1 text-red-300 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete event?"
          message={`Permanently delete "${deleteTarget.name}" and its bidder list, history, and settings?`}
          confirmLabel="Delete Event"
          danger
          onConfirm={() => {
            onDelete(deleteTarget.id);
            setConfirmDeleteId(null);
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </Modal>
  );
}
