import logo from '../../assets/bidboard-logo.png';

interface HeaderProps {
  eventName: string;
  connected: boolean;
  channelSupported: boolean;
  isLive: boolean;
  onOpenSettings: () => void;
  onOpenEvents: () => void;
  onOpenHelp: () => void;
}

export function Header({
  eventName,
  connected,
  channelSupported,
  isLive,
  onOpenSettings,
  onOpenEvents,
  onOpenHelp,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-white/10 bg-neutral-950 px-5 py-3">
      <div className="flex items-center gap-3">
        <img src={logo} alt="BidBoard" className="h-8 w-auto" />
        <div className="h-6 w-px bg-white/15" />
        <button
          type="button"
          onClick={onOpenEvents}
          className="rounded px-2 py-1 text-sm font-medium text-neutral-200 hover:bg-white/5"
        >
          {eventName || 'No Event Selected'}
        </button>
      </div>

      <div className="flex items-center gap-3">
        {isLive && (
          <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            Live
          </span>
        )}
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            connected ? 'bg-green-500/15 text-green-400' : 'bg-neutral-700/40 text-neutral-400'
          }`}
          title={channelSupported ? undefined : 'This browser does not support live window messaging.'}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-neutral-500'}`} />
          Audience Display {connected ? 'Connected' : 'Not Connected'}
        </span>
        <button
          type="button"
          onClick={onOpenHelp}
          className="rounded px-2 py-1.5 text-sm text-neutral-400 hover:bg-white/5 hover:text-white"
          title="Keyboard shortcuts"
        >
          ?
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="rounded px-2 py-1.5 text-sm text-neutral-400 hover:bg-white/5 hover:text-white"
          title="Settings"
        >
          ⚙
        </button>
      </div>
    </header>
  );
}
