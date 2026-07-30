interface KeypadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClearEntry: () => void;
  disabled?: boolean;
}

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

const keyCls =
  'min-h-16 rounded-lg bg-white/5 text-3xl font-bold text-white active:bg-white/15 disabled:opacity-40 select-none';

export function Keypad({ onDigit, onBackspace, onClearEntry, disabled }: KeypadProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {ROWS.flat().map((digit) => (
        <button key={digit} type="button" disabled={disabled} className={keyCls} onClick={() => onDigit(digit)}>
          {digit}
        </button>
      ))}
      <button
        type="button"
        disabled={disabled}
        className={`${keyCls} text-base font-semibold uppercase tracking-wide text-neutral-300`}
        onClick={onClearEntry}
      >
        Clear
      </button>
      <button type="button" disabled={disabled} className={keyCls} onClick={() => onDigit('0')}>
        0
      </button>
      <button
        type="button"
        disabled={disabled}
        className={`${keyCls} text-2xl`}
        onClick={onBackspace}
        aria-label="Backspace"
      >
        ⌫
      </button>
    </div>
  );
}
