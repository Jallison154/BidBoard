import type { OperatorConsole } from '../../hooks/useOperatorConsole';

interface BidderConsoleProps {
  console: OperatorConsole;
  autoShow: boolean;
  onSetAutoShow: (value: boolean) => void;
  onRequestClear: () => void;
  onRequestShowUnknown: () => void;
}

export function BidderConsole({ console: c, autoShow, onSetAutoShow, onRequestClear, onRequestShowUnknown }: BidderConsoleProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-white/10 bg-neutral-900/60 p-5">
      <div className="flex items-center justify-between">
        <label htmlFor="bidder-number-input" className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Bidder Number
        </label>
        <button
          type="button"
          onClick={() => onSetAutoShow(!autoShow)}
          className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${
            autoShow
              ? 'animate-pulse border-amber-400 bg-amber-500/20 text-amber-300'
              : 'border-white/15 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${autoShow ? 'bg-amber-400' : 'bg-neutral-600'}`} />
          Auto Show {autoShow ? 'On' : 'Off'}
        </button>
      </div>

      <input
        id="bidder-number-input"
        ref={c.inputRef}
        value={c.inputValue}
        onChange={(e) => c.setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            c.handleEnterKey();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            c.handleEscape();
          }
        }}
        placeholder="Number…"
        autoFocus
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-md border border-white/15 bg-black/40 px-4 py-4 text-5xl font-bold tracking-wide text-white outline-none focus:border-blue-500"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={c.handleLookup}
          className="flex-1 rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/5"
        >
          Lookup
        </button>
        <button
          type="button"
          onClick={c.showPreviewNow}
          disabled={c.status.kind !== 'preview'}
          className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-900 disabled:text-blue-300/50"
        >
          Show
        </button>
        <button
          type="button"
          onClick={onRequestClear}
          className="flex-1 rounded-md border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10"
        >
          Clear Display
        </button>
      </div>

      <div className="min-h-[140px] rounded-md border border-white/10 bg-black/30 p-4">
        {c.status.kind === 'idle' && (
          <p className="text-sm text-neutral-500">Enter a bidder number to preview a match.</p>
        )}

        {c.status.kind === 'preview' && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-green-400">Match found</span>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-white">{c.status.bidder.number}</span>
            </div>
            <label className="text-xs text-neutral-400">
              Display name
              <input
                value={c.status.overrideName}
                onChange={(e) => c.setOverrideName(e.target.value)}
                className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-base text-white outline-none focus:border-blue-500"
              />
            </label>
            <label className="text-xs text-neutral-400">
              Company (optional)
              <input
                value={c.status.overrideCompany}
                onChange={(e) => c.setOverrideCompany(e.target.value)}
                className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-base text-white outline-none focus:border-blue-500"
              />
            </label>
          </div>
        )}

        {c.status.kind === 'duplicates' && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-400">
              Multiple bidders match "{c.status.query}" — choose one
            </span>
            <ul className="flex flex-col gap-1">
              {c.status.matches.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => c.selectMatch(m)}
                    className="w-full rounded border border-white/10 px-3 py-2 text-left text-sm text-white hover:border-blue-500 hover:bg-blue-500/10"
                  >
                    <span className="font-bold">{m.number}</span> — {m.displayName || <em>no name</em>}
                    {m.company ? ` (${m.company})` : ''}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {c.status.kind === 'unknown' && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-red-400">
              No bidder found for "{c.status.query}"
            </span>
            <p className="text-xs text-neutral-500">
              The audience display has not changed. You can correct the number above, or type a name to display it
              anyway.
            </p>
            <label className="text-xs text-neutral-400">
              Display name
              <input
                value={c.status.nameInput}
                onChange={(e) => c.setUnknownName(e.target.value)}
                placeholder="Enter a name manually"
                className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-base text-white outline-none focus:border-blue-500"
              />
            </label>
            <label className="text-xs text-neutral-400">
              Company (optional)
              <input
                value={c.status.companyInput}
                onChange={(e) => c.setUnknownCompany(e.target.value)}
                className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-base text-white outline-none focus:border-blue-500"
              />
            </label>
            <button
              type="button"
              onClick={onRequestShowUnknown}
              className="mt-1 self-start rounded-md bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-500"
            >
              Display Anyway
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
