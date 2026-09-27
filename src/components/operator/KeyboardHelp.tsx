import { Modal } from '../common/Modal';

const SHORTCUTS: [string, string][] = [
  ['Type a number', 'Focus the bidder input and start typing. Letters type too when Allow letters in bidder numbers is on.'],
  ['Enter', 'Preview, or show the previewed bidder (also from the name fields)'],
  ['Escape', 'Clear the current input or preview'],
  ['Space', 'Show the previewed bidder'],
  ['C', 'Clear the full screen display (when the bidder field is empty and not focused)'],
  ['F', 'Open or focus the full screen display window'],
  ['Up / Down', 'Cycle through recently displayed bidders'],
];

export function KeyboardHelp({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Keyboard Shortcuts" onClose={onClose}>
      <ul className="flex flex-col gap-2">
        {SHORTCUTS.map(([key, desc]) => (
          <li key={key} className="flex items-center justify-between gap-4 text-sm">
            <kbd className="rounded border border-white/20 bg-black/40 px-2 py-1 font-mono text-xs text-neutral-200">
              {key}
            </kbd>
            <span className="text-right text-neutral-400">{desc}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-neutral-500">
        Shortcuts are disabled while typing in another text field, so editing names or settings never triggers them
        by accident.
      </p>
    </Modal>
  );
}
