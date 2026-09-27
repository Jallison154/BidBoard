import { useState } from 'react';
import type { DisplayPresetId, DisplaySettings, EventTitleVisibility, LogoPosition, SafetySettings, TransitionStyle, WaitingStyle } from '../../types';
import type { RememberedDevice } from '../../shared/socketTypes';
import { eventTitleVisibility } from '../../lib/events';
import { Modal } from '../common/Modal';
import { RemoteSettingsPanel } from './RemoteSettingsPanel';
import type { useRemoteServer } from '../../hooks/useRemoteServer';

interface SettingsPanelProps {
  settings: DisplaySettings;
  safety: SafetySettings;
  onUpdateSettings: (patch: Partial<DisplaySettings>) => void;
  onApplyPreset: (presetId: Exclude<DisplayPresetId, 'custom'>) => void;
  onUpdateSafety: (patch: Partial<SafetySettings>) => void;
  rememberedDevices: RememberedDevice[];
  onForgetDevice: (deviceId: string) => void;
  onClose: () => void;
  remote: ReturnType<typeof useRemoteServer>;
}

const FONT_OPTIONS = [
  { label: 'System Sans', value: 'system-ui, sans-serif' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Condensed Sans', value: '"Arial Narrow", sans-serif' },
  { label: 'Monospace', value: 'ui-monospace, Consolas, monospace' },
];

const LOGO_POSITIONS: { label: string; value: LogoPosition }[] = [
  { label: 'Top Left', value: 'top-left' },
  { label: 'Top Center', value: 'top-center' },
  { label: 'Top Right', value: 'top-right' },
  { label: 'Bottom Left', value: 'bottom-left' },
  { label: 'Bottom Center', value: 'bottom-center' },
  { label: 'Bottom Right', value: 'bottom-right' },
  { label: 'Center (waiting screen only)', value: 'center-waiting-only' },
];

const PRESETS: { label: string; value: Exclude<DisplayPresetId, 'custom'> }[] = [
  { label: 'BidBoard Dark', value: 'bidboard-dark' },
  { label: 'Clean White', value: 'clean-white' },
  { label: 'Event Gold', value: 'event-gold' },
  { label: 'High Contrast', value: 'high-contrast' },
];

const TABS = ['Presets', 'Display', 'Branding', 'Event', 'Safety', 'Remote'] as const;
type Tab = (typeof TABS)[number];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-neutral-400">
      {label}
      {children}
    </label>
  );
}

export function SettingsPanel({
  settings,
  safety,
  onUpdateSettings,
  onApplyPreset,
  onUpdateSafety,
  rememberedDevices,
  onForgetDevice,
  onClose,
  remote,
}: SettingsPanelProps) {
  const [tab, setTab] = useState<Tab>('Presets');
  const locked = safety.lockDisplaySettings && tab !== 'Safety' && tab !== 'Remote';

  const inputCls =
    'rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-40';

  return (
    <Modal title="Display & Event Settings" onClose={onClose} wide>
      <div className="flex gap-4">
        <nav className="flex w-36 shrink-0 flex-col gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded px-3 py-2 text-left text-sm font-medium ${
                tab === t ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:bg-white/5'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        <div className="flex-1">
          {locked && (
            <p className="mb-3 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
              Display settings are locked for this event. Unlock in the Safety tab to make changes.
            </p>
          )}

          {tab === 'Presets' && (
            <div className="grid grid-cols-2 gap-3">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  disabled={locked}
                  onClick={() => onApplyPreset(p.value)}
                  className={`rounded-lg border p-4 text-left disabled:opacity-40 ${
                    settings.presetId === p.value ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  <span className="font-semibold text-white">{p.label}</span>
                </button>
              ))}
              <div className="col-span-2 rounded-lg border border-white/10 p-4 text-sm text-neutral-400">
                {settings.presetId === 'custom'
                  ? 'Currently using a custom theme. Adjust colors and typography in the Display tab.'
                  : 'Any manual change in the Display or Branding tabs will switch this event to a Custom theme.'}
              </div>
            </div>
          )}

          {tab === 'Display' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Background Color">
                <input
                  type="color"
                  disabled={locked}
                  value={settings.backgroundColor}
                  onChange={(e) => onUpdateSettings({ backgroundColor: e.target.value })}
                  className="h-9 w-full rounded border border-white/15 bg-black/40 disabled:opacity-40"
                />
              </Field>
              <Field label="Accent Color">
                <input
                  type="color"
                  disabled={locked}
                  value={settings.accentColor}
                  onChange={(e) => onUpdateSettings({ accentColor: e.target.value })}
                  className="h-9 w-full rounded border border-white/15 bg-black/40 disabled:opacity-40"
                />
              </Field>
              <Field label="Bidder Number Color">
                <input
                  type="color"
                  disabled={locked}
                  value={settings.numberColor}
                  onChange={(e) => onUpdateSettings({ numberColor: e.target.value })}
                  className="h-9 w-full rounded border border-white/15 bg-black/40 disabled:opacity-40"
                />
              </Field>
              <Field label="Bidder Name Color">
                <input
                  type="color"
                  disabled={locked}
                  value={settings.nameColor}
                  onChange={(e) => onUpdateSettings({ nameColor: e.target.value })}
                  className="h-9 w-full rounded border border-white/15 bg-black/40 disabled:opacity-40"
                />
              </Field>

              <Field label="Font Family">
                <select
                  disabled={locked}
                  value={settings.fontFamily}
                  onChange={(e) => onUpdateSettings({ fontFamily: e.target.value })}
                  className={inputCls}
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Text Alignment">
                <select
                  disabled={locked}
                  value={settings.textAlign}
                  onChange={(e) => onUpdateSettings({ textAlign: e.target.value as DisplaySettings['textAlign'] })}
                  className={inputCls}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </Field>

              <Field label="Number Font Weight">
                <select
                  disabled={locked}
                  value={settings.numberWeight}
                  onChange={(e) => onUpdateSettings({ numberWeight: Number(e.target.value) })}
                  className={inputCls}
                >
                  {[400, 500, 600, 700, 800, 900].map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Name Font Weight">
                <select
                  disabled={locked}
                  value={settings.nameWeight}
                  onChange={(e) => onUpdateSettings({ nameWeight: Number(e.target.value) })}
                  className={inputCls}
                >
                  {[400, 500, 600, 700, 800, 900].map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={`Number Size (${settings.numberSize.toFixed(2)}×)`}>
                <input
                  type="range"
                  min={0.5}
                  max={1.6}
                  step={0.05}
                  disabled={locked}
                  value={settings.numberSize}
                  onChange={(e) => onUpdateSettings({ numberSize: Number(e.target.value) })}
                  className="disabled:opacity-40"
                />
              </Field>
              <Field label={`Name Size (${settings.nameSize.toFixed(2)}×)`}>
                <input
                  type="range"
                  min={0.5}
                  max={1.6}
                  step={0.05}
                  disabled={locked}
                  value={settings.nameSize}
                  onChange={(e) => onUpdateSettings({ nameSize: Number(e.target.value) })}
                  className="disabled:opacity-40"
                />
              </Field>
              <Field label={`Spacing (${settings.spacing.toFixed(2)}×)`}>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.05}
                  disabled={locked}
                  value={settings.spacing}
                  onChange={(e) => onUpdateSettings({ spacing: Number(e.target.value) })}
                  className="disabled:opacity-40"
                />
              </Field>

              <Field label="Transition Style">
                <select
                  disabled={locked}
                  value={settings.transition}
                  onChange={(e) => onUpdateSettings({ transition: e.target.value as TransitionStyle })}
                  className={inputCls}
                >
                  <option value="none">None</option>
                  <option value="fade">Fade</option>
                  <option value="quick-fade">Quick Fade</option>
                  <option value="slide-up">Slide Up</option>
                </select>
              </Field>
              <Field label="Clear Display Behavior">
                <select
                  disabled={locked}
                  value={settings.clearBehavior}
                  onChange={(e) => onUpdateSettings({ clearBehavior: e.target.value as DisplaySettings['clearBehavior'] })}
                  className={inputCls}
                >
                  <option value="waiting">Return to waiting screen</option>
                  <option value="fade-to-black">Fade to black</option>
                </select>
              </Field>

              <Field label="Waiting Screen Style">
                <select
                  disabled={locked}
                  value={settings.waitingStyle}
                  onChange={(e) => onUpdateSettings({ waitingStyle: e.target.value as WaitingStyle })}
                  className={inputCls}
                >
                  <option value="blank">Blank</option>
                  <option value="logo">Logo</option>
                  <option value="event-title">Event Title</option>
                  <option value="custom-message">Custom Message</option>
                </select>
              </Field>
              {settings.waitingStyle === 'custom-message' && (
                <Field label="Custom Message">
                  <input
                    disabled={locked}
                    value={settings.waitingMessage}
                    onChange={(e) => onUpdateSettings({ waitingMessage: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              )}

              <div className="col-span-2 flex flex-wrap gap-4 pt-2">
                {(
                  [
                    ['showBidderNumber', 'Show Bidder Number'],
                    ['showBidderName', 'Show Bidder Name'],
                    ['showCompany', 'Show Company'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-neutral-300">
                    <input
                      type="checkbox"
                      disabled={locked}
                      checked={settings[key]}
                      onChange={(e) => onUpdateSettings({ [key]: e.target.checked })}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {tab === 'Branding' && (
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  disabled={locked}
                  checked={settings.showLogo}
                  onChange={(e) => onUpdateSettings({ showLogo: e.target.checked })}
                />
                Show Logo
              </label>

              <Field label="Logo File (PNG, JPG, SVG, WebP)">
                <input
                  type="file"
                  disabled={locked}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => onUpdateSettings({ logoDataUrl: reader.result as string });
                    reader.readAsDataURL(file);
                  }}
                  className="text-sm text-neutral-300"
                />
              </Field>

              {settings.logoDataUrl && (
                <div className="flex items-center gap-3 rounded border border-white/10 bg-black/30 p-3">
                  <img src={settings.logoDataUrl} alt="Logo preview" className="h-16 w-auto object-contain" />
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => onUpdateSettings({ logoDataUrl: undefined })}
                    className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                  >
                    Remove Logo
                  </button>
                </div>
              )}

              <Field label={`Logo Size (${settings.logoSize.toFixed(2)}×)`}>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.05}
                  disabled={locked}
                  value={settings.logoSize}
                  onChange={(e) => onUpdateSettings({ logoSize: Number(e.target.value) })}
                  className="disabled:opacity-40"
                />
              </Field>

              <Field label="Logo Position">
                <select
                  disabled={locked}
                  value={settings.logoPosition}
                  onChange={(e) => onUpdateSettings({ logoPosition: e.target.value as LogoPosition })}
                  className={inputCls}
                >
                  {LOGO_POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {tab === 'Event' && (
            <div className="flex flex-col gap-3">
              <Field label="Event name on the full screen display">
                <select
                  disabled={locked}
                  value={eventTitleVisibility(settings)}
                  onChange={(e) => {
                    const visibility = e.target.value as EventTitleVisibility;
                    onUpdateSettings({ eventTitleVisibility: visibility, showEventTitle: visibility !== 'none' });
                  }}
                  className={inputCls}
                >
                  <option value="always">Always</option>
                  <option value="on-show">Only while a bidder is showing</option>
                  <option value="none">Don't show</option>
                </select>
              </Field>
              <Field label="Event Title (shown on the full screen display)">
                <input
                  disabled={locked}
                  value={settings.eventTitle}
                  onChange={(e) => onUpdateSettings({ eventTitle: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Event Subtitle">
                <input
                  disabled={locked}
                  value={settings.eventSubtitle}
                  onChange={(e) => onUpdateSettings({ eventSubtitle: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          {tab === 'Safety' && (
            <div className="flex flex-col gap-3">
              {(
                [
                  {
                    key: 'allowLetterNumbers',
                    label: 'Allow letters in bidder numbers',
                    description:
                      'The number field accepts digits only. Turn this on when a show uses letters in bidder numbers.',
                    checked: safety.allowLetterNumbers === true,
                  },
                  {
                    key: 'requireConfirmUnknownBidder',
                    label: 'Require confirmation before showing an unknown bidder',
                    description:
                      'Asks before a number that is not in the bidder list goes on the full screen display.',
                    checked: safety.requireConfirmUnknownBidder,
                  },
                  {
                    key: 'requireConfirmClear',
                    label: 'Require confirmation before clearing the full screen display',
                    description: 'Asks before Clear Display, Escape, or C removes the bidder from the full screen display.',
                    checked: safety.requireConfirmClear,
                  },
                  {
                    key: 'disableAutoShowOnDuplicates',
                    label: 'Disable Auto Show when duplicate bidder numbers exist',
                    description:
                      'With Auto Show on, a number used by more than one bidder stays in the preview so you can choose which name to show.',
                    checked: safety.disableAutoShowOnDuplicates,
                  },
                  {
                    key: 'lockDisplaySettings',
                    label: 'Lock display settings during the event',
                    description:
                      'Presets, Display, Branding, and Event cannot be changed until this is turned off. Safety and Remote stay open.',
                    checked: safety.lockDisplaySettings,
                  },
                  {
                    key: 'lockBidderList',
                    label: 'Lock bidder-list editing during the event',
                    description: 'Import, add, edit, delete, and remove all are turned off. Search and Preview still work.',
                    checked: safety.lockBidderList,
                  },
                  {
                    key: 'rememberDevices',
                    label: 'Remember phones and tablets that join this event',
                    description:
                      'A remembered device reconnects without the PIN if the connection drops. A new event starts with none.',
                    checked: safety.rememberDevices !== false,
                  },
                ] as const
              ).map((option) => (
                <label key={option.key} className="flex items-start gap-2 text-sm text-neutral-300">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={option.checked}
                    onChange={(e) => onUpdateSafety({ [option.key]: e.target.checked })}
                  />
                  <span>
                    {option.label}
                    <span className="block text-xs text-neutral-500">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          )}

          {tab === 'Remote' && (
            <RemoteSettingsPanel
              serverOnline={remote.serverOnline}
              status={remote.status}
              rememberedDevices={rememberedDevices}
              rememberDevices={safety.rememberDevices !== false}
              onForgetDevice={onForgetDevice}
              onToggleEnabled={(enabled) => remote.updateSettings({ remoteAccessEnabled: enabled })}
              onToggleAccepting={(accepting) => remote.updateSettings({ acceptingNewConnections: accepting })}
              onSetMode={(mode) => remote.updateSettings({ remoteMode: mode })}
              onSetAllowClear={(allow) => remote.updateSettings({ allowRemoteClear: allow })}
              onRegeneratePin={remote.regeneratePin}
              onDisconnectRemote={remote.disconnectRemote}
              onDisconnectAll={remote.disconnectAll}
              onUpdatePermission={remote.updateRemotePermission}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
