import { useEffect, useState } from 'react';
import type { DisplayResolution } from '../../hooks/useDisplayChannel';

interface LiveOutputPreviewProps {
  connected: boolean;
  channelSupported: boolean;
  resolution: DisplayResolution | null;
  isLive: boolean;
  onOpenAudience: () => void;
}

const SAFE_AREA_GUIDES_KEY = 'bidboard:showSafeAreaGuides';

function readSafeAreaGuidesPref(): boolean {
  try {
    return localStorage.getItem(SAFE_AREA_GUIDES_KEY) === '1';
  } catch {
    return false;
  }
}

type StatusColor = 'green' | 'yellow' | 'red';

function statusFor(connected: boolean, channelSupported: boolean): { color: StatusColor; label: string } {
  if (!channelSupported) return { color: 'red', label: 'Communication error' };
  if (connected) return { color: 'green', label: 'Audience display connected' };
  return { color: 'yellow', label: 'Audience window not connected' };
}

export function LiveOutputPreview({ connected, channelSupported, resolution, isLive, onOpenAudience }: LiveOutputPreviewProps) {
  const [showGuides, setShowGuides] = useState(readSafeAreaGuidesPref);

  useEffect(() => {
    try {
      localStorage.setItem(SAFE_AREA_GUIDES_KEY, showGuides ? '1' : '0');
    } catch {
      // best-effort only; guides are a local convenience preference
    }
  }, [showGuides]);

  const status = statusFor(connected, channelSupported);
  const dotClass =
    status.color === 'green' ? 'bg-green-500' : status.color === 'yellow' ? 'bg-amber-400' : 'bg-red-500';
  const textClass =
    status.color === 'green' ? 'text-green-400' : status.color === 'yellow' ? 'text-amber-300' : 'text-red-400';

  const src = `${window.location.pathname}?view=audience&embedded=1`;
  const aspectRatio = resolution ? `${resolution.width} / ${resolution.height}` : '1920 / 1080';

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-neutral-900/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Live Output</h3>
          {isLive && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              Live
            </span>
          )}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-neutral-400">
          <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} />
          Safe-area guides
        </label>
      </div>

      <div
        className="relative mx-auto w-full max-w-sm overflow-hidden rounded-md border-2 border-white/15"
        style={{ aspectRatio }}
      >
        <iframe
          src={src}
          title="Live audience output preview"
          className="h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin"
        />
        {showGuides && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-[5%] border border-dashed border-blue-400/50" />
            <div className="absolute inset-[10%] border border-dashed border-blue-400/30" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className={`flex items-center gap-1.5 font-semibold ${textClass}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
          {status.label}
        </span>
        {resolution && (
          <span className="text-neutral-500">
            {resolution.width}×{resolution.height}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-white/10 pt-2">
        <button
          type="button"
          onClick={onOpenAudience}
          className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
        >
          Open Audience Display
        </button>
        <p className="text-xs text-neutral-500">
          Drag it to your second screen, press{' '}
          <kbd className="rounded border border-white/20 bg-black/40 px-1">F11</kbd> to go full-screen, or{' '}
          <kbd className="rounded border border-white/20 bg-black/40 px-1">F</kbd> here to reopen it.
        </p>
      </div>
      {!channelSupported && (
        <p className="text-xs text-amber-400">
          This browser doesn't support live window messaging. Use an up-to-date Chrome, Edge, Firefox, or Safari.
        </p>
      )}
    </div>
  );
}
