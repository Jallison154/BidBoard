interface StatusBarProps {
  bidderCount: number;
  eventName: string;
}

export function StatusBar({ bidderCount, eventName }: StatusBarProps) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-neutral-950 px-5 py-2 text-xs text-neutral-500">
      <span>
        {bidderCount} bidder{bidderCount === 1 ? '' : 's'} loaded · {eventName || 'No event'}
      </span>
      <span>Enter: show · Esc: clear · Space: show preview · C: clear display · F: audience window</span>
      <span>Saved locally in this browser</span>
    </footer>
  );
}
