import { useState } from 'react';
import type { CompanionLayout } from '../../lib/companionLayout';

const LAYOUTS = [
  ['phone', 'Phone'],
  ['ipad', 'Tablet'],
] as const;

interface LayoutSwitchProps {
  layout: CompanionLayout;
  onChange: (layout: CompanionLayout) => void;
}

export function LayoutSwitch({ layout, onChange }: LayoutSwitchProps) {
  return (
    <div className="flex h-11 shrink-0 rounded-lg bg-white/5 p-0.5" role="group" aria-label="Layout">
      {LAYOUTS.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={layout === id}
          className={`h-10 rounded-md px-3 text-sm font-bold ${
            layout === id ? 'bg-blue-600 text-white' : 'text-neutral-300'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

interface LayoutMenuProps {
  layout: CompanionLayout;
  label: string;
  color: string;
  onChange: (layout: CompanionLayout) => void;
}

/** Connection status that opens the phone or tablet choice. */
export function LayoutMenu({ layout, label, color, onChange }: LayoutMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-11 w-28 items-center justify-end gap-1.5 text-xs font-semibold text-neutral-300"
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} />
        <span className="truncate">{label}</span>
      </button>
      {open && (
        <>
          <button type="button" aria-label="Close layout menu" className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            aria-label="Phone or tablet"
            className="absolute top-full right-0 z-50 mt-1 w-36 rounded-lg border border-white/10 bg-neutral-900 p-1 shadow-lg"
          >
            {LAYOUTS.map(([id, option]) => (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={layout === id}
                onClick={() => {
                  onChange(id);
                  setOpen(false);
                }}
                className={`flex h-11 w-full items-center rounded-md px-3 text-left text-sm font-bold ${
                  layout === id ? 'bg-blue-600 text-white' : 'text-neutral-200 hover:bg-white/5'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
