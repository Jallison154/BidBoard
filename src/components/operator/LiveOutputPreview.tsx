import { useEffect, useRef, useState } from 'react';
import type { DisplayResolution } from '../../hooks/useDisplayChannel';
import { AutoClearCountdown } from './BidderConsole';

interface LiveOutputPreviewProps {
  connected: boolean;
  channelSupported: boolean;
  resolution: DisplayResolution | null;
  isLive: boolean;
  autoClearDeadline: number | null;
  onOpenAudience: () => void;
}

const SAFE_AREA_GUIDES_KEY = 'bidboard:showSafeAreaGuides';
const DEFAULT_OUTPUT: DisplayResolution = { width: 1920, height: 1080 };

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
  if (connected) return { color: 'green', label: 'Full screen display connected' };
  return { color: 'yellow', label: 'Full screen display not connected' };
}

export function LiveOutputPreview({
  connected,
  channelSupported,
  resolution,
  isLive,
  autoClearDeadline,
  onOpenAudience,
}: LiveOutputPreviewProps) {
  const [showGuides, setShowGuides] = useState(readSafeAreaGuidesPref);
  const boxRef = useRef<HTMLDivElement>(null);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });

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
  const output = connected && resolution ? resolution : DEFAULT_OUTPUT;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => {
      const ratio = output.width / output.height;
      const availW = box.clientWidth;
      const availH = box.clientHeight;
      if (availW <= 0 || availH <= 0) {
        setFrameSize({ width: 0, height: 0 });
        return;
      }
      let width = availW;
      let height = width / ratio;
      if (height > availH) {
        height = availH;
        width = height * ratio;
      }
      setFrameSize({ width, height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [output.width, output.height]);

  const frameScale = frameSize.width > 0 ? frameSize.width / output.width : 0;

  return (
    <div className="flex min-h-48 flex-1 flex-col gap-2 rounded-lg border border-white/10 bg-neutral-900/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Live Output</h3>
          {isLive && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              Live
            </span>
          )}
          {isLive && autoClearDeadline != null && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-blue-300">
              <AutoClearCountdown deadline={autoClearDeadline} />
            </span>
          )}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-neutral-400">
          <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} />
          Safe-area guides
        </label>
      </div>

      <div ref={boxRef} className="flex min-h-0 flex-1 items-center justify-center">
        <div
          className="relative overflow-hidden rounded-md border-2 border-white/15"
          style={{ width: frameSize.width, height: frameSize.height }}
        >
        <iframe
          src={src}
          title="Live full screen output preview"
          className="absolute top-0 left-0 border-0"
          sandbox="allow-scripts allow-same-origin"
          style={{
            width: output.width,
            height: output.height,
            transform: `scale(${frameScale})`,
            transformOrigin: 'top left',
          }}
        />
          {showGuides && (
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-[5%] border border-dashed border-blue-400/50" />
              <div className="absolute inset-[10%] border border-dashed border-blue-400/30" />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className={`flex items-center gap-1.5 font-semibold ${textClass}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
          {status.label}
        </span>
        <span className="text-neutral-500">
          {output.width}×{output.height}
        </span>
      </div>

      <div className="flex flex-col gap-2 border-t border-white/10 pt-2">
        <button
          type="button"
          onClick={onOpenAudience}
          className="self-start rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
        >
          Open Full Screen Display
        </button>
        <p className="text-xs leading-5 text-neutral-500">
          Drag it to your second screen, then full-screen with{' '}
          <kbd className="rounded border border-white/20 bg-black/40 px-1">
            {/Mac|iPhone|iPad/.test(navigator.platform) ? '⌃⌘F' : 'F11'}
          </kbd>
          , or press <kbd className="rounded border border-white/20 bg-black/40 px-1">F</kbd> here to reopen it.
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
