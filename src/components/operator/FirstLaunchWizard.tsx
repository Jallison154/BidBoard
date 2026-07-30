import { useState } from 'react';
import type { DisplayPresetId } from '../../types';
import { useApp } from '../../context/AppContext';

interface FirstLaunchWizardProps {
  onDone: (opts: { openImport: boolean; openAudience: boolean }) => void;
  onSkip: () => void;
}

const PRESETS: { label: string; value: Exclude<DisplayPresetId, 'custom'>; blurb: string }[] = [
  { label: 'BidBoard Dark', value: 'bidboard-dark', blurb: 'Black background, blue accent — the default look.' },
  { label: 'Clean White', value: 'clean-white', blurb: 'Bright, minimal, great for daytime galas.' },
  { label: 'Event Gold', value: 'event-gold', blurb: 'Warm gold tones for formal benefit auctions.' },
  { label: 'High Contrast', value: 'high-contrast', blurb: 'Maximum legibility from a distance.' },
];

export function FirstLaunchWizard({ onDone, onSkip }: FirstLaunchWizardProps) {
  const app = useApp();
  const [step, setStep] = useState(1);
  const [eventName, setEventName] = useState('My Auction');
  const [bidderChoice, setBidderChoice] = useState<'demo' | 'import' | 'empty'>('demo');
  const [preset, setPreset] = useState<Exclude<DisplayPresetId, 'custom'>>('bidboard-dark');

  const finish = () => {
    app.newEvent(eventName.trim() || 'My Event', bidderChoice === 'demo');
    onDone({ openImport: bidderChoice === 'import', openAudience: true });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg rounded-lg border border-white/10 bg-neutral-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Welcome to BidBoard</h2>
          <button type="button" onClick={onSkip} className="text-xs text-neutral-500 hover:text-neutral-300">
            Skip setup
          </button>
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-neutral-400">Let's set up your event.</p>
            <label className="flex flex-col gap-1 text-xs text-neutral-400">
              Event name
              <input
                autoFocus
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="rounded border border-white/15 bg-black/40 px-3 py-2 text-base text-white outline-none focus:border-blue-500"
              />
            </label>
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!eventName.trim()}
              className="mt-2 self-end rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-neutral-400">How would you like to start your bidder list?</p>
            {(
              [
                ['demo', 'Start with a small demo list', 'Five sample bidders so you can try BidBoard immediately.'],
                ['import', 'Import a bidder list now', 'Bring in a CSV or Excel file after setup.'],
                ['empty', 'Start with an empty list', 'Add bidders manually during the event.'],
              ] as const
            ).map(([value, label, blurb]) => (
              <button
                key={value}
                type="button"
                onClick={() => setBidderChoice(value)}
                className={`rounded-lg border p-3 text-left ${
                  bidderChoice === value ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/25'
                }`}
              >
                <div className="text-sm font-semibold text-white">{label}</div>
                <div className="text-xs text-neutral-500">{blurb}</div>
              </button>
            ))}
            <div className="mt-2 flex justify-between">
              <button type="button" onClick={() => setStep(1)} className="rounded px-3 py-2 text-sm text-neutral-400 hover:bg-white/5">
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-neutral-400">Choose a display style. You can change this any time.</p>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPreset(p.value)}
                  className={`rounded-lg border p-3 text-left ${
                    preset === p.value ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="text-sm font-semibold text-white">{p.label}</div>
                  <div className="text-xs text-neutral-500">{p.blurb}</div>
                </button>
              ))}
            </div>
            <div className="mt-2 flex justify-between">
              <button type="button" onClick={() => setStep(2)} className="rounded px-3 py-2 text-sm text-neutral-400 hover:bg-white/5">
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  finish();
                  app.applyPreset(preset);
                }}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Finish Setup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
