interface StatusBarProps {
  bidderCount: number;
  eventName: string;
}

export function StatusBar({ bidderCount, eventName }: StatusBarProps) {
  return (
    <footer className="flex items-center justify-between gap-4 border-t border-white/10 bg-neutral-950 px-5 py-2 text-xs text-neutral-500">
      <span className="shrink-0">
        {bidderCount} bidder{bidderCount === 1 ? '' : 's'} loaded · {eventName || 'No event'} · Saved in this browser
      </span>
      <span className="min-w-0 truncate">
        Enter show · Esc clear · Space preview · C clear · F full screen
      </span>
    </footer>
  );
}
