interface AudienceStatusCardProps {
  connected: boolean;
  channelSupported: boolean;
  onOpenAudience: () => void;
}

export function AudienceStatusCard({ connected, channelSupported, onOpenAudience }: AudienceStatusCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-neutral-900/60 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Audience Display</h3>
        <span
          className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
            connected ? 'bg-green-500/15 text-green-400' : 'bg-neutral-700/40 text-neutral-400'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-neutral-500'}`} />
          {connected ? 'Connected' : 'Not Connected'}
        </span>
      </div>
      <button
        type="button"
        onClick={onOpenAudience}
        className="self-start rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500"
      >
        Open Audience Display
      </button>
      <p className="text-xs text-neutral-500">
        Drag the new window onto your second monitor, projector, or LED wall, then press{' '}
        <kbd className="rounded border border-white/20 bg-black/40 px-1">F11</kbd> (or your browser's full-screen
        control) to go full-screen. Press <kbd className="rounded border border-white/20 bg-black/40 px-1">F</kbd> here
        any time to reopen or refocus it.
      </p>
      {!channelSupported && (
        <p className="text-xs text-amber-400">
          This browser does not support live window messaging (BroadcastChannel). Use an up-to-date Chrome, Edge,
          Firefox, or Safari.
        </p>
      )}
      {channelSupported && !connected && (
        <p className="text-xs text-amber-400">
          The audience window is closed or not responding. Open it above to resume sending bidders to the screen.
        </p>
      )}
    </div>
  );
}
