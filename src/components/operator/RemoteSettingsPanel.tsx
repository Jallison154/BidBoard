import type { RememberedDevice, RemoteMode, RemotePermission, ServerStatus } from '../../shared/socketTypes';

interface RemoteSettingsPanelProps {
  serverOnline: boolean;
  status: ServerStatus | null;
  rememberedDevices: RememberedDevice[];
  rememberDevices: boolean;
  onForgetDevice: (deviceId: string) => void;
  onToggleEnabled: (enabled: boolean) => void;
  onToggleAccepting: (accepting: boolean) => void;
  onSetMode: (mode: RemoteMode) => void;
  onSetAllowClear: (allow: boolean) => void;
  onRegeneratePin: () => void;
  onDisconnectRemote: (remoteId: string) => void;
  onDisconnectAll: () => void;
  onUpdatePermission: (remoteId: string, permission: RemotePermission) => void;
}

const MODES: { value: RemoteMode; label: string; blurb: string }[] = [
  { value: 'direct', label: 'Direct Show', blurb: 'A valid bidder number from the remote goes live immediately.' },
  { value: 'preview', label: 'Send to Preview', blurb: 'Remote submissions stage into the operator preview; the operator presses Show.' },
  { value: 'approval', label: 'Approval Required', blurb: 'The operator must approve every remote request before it goes live.' },
];

const PERMISSIONS: { value: RemotePermission; label: string }[] = [
  { value: 'keypad-only', label: 'Keypad Only' },
  { value: 'operator-remote', label: 'Operator Remote' },
  { value: 'view-only', label: 'View Only' },
];

function RememberedDevices({
  devices,
  enabled,
  onForget,
}: {
  devices: RememberedDevice[];
  enabled: boolean;
  onForget: (deviceId: string) => void;
}) {
  return (
    <div className="rounded border border-white/10 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        Remembered for this event ({devices.length})
      </div>
      <p className="mb-2 text-xs text-neutral-500">
        {enabled
          ? 'These devices reconnect without the PIN while this event is open.'
          : 'Remembering is off in Safety, so these devices enter the PIN to join.'}
      </p>
      {devices.length === 0 ? (
        <p className="text-sm text-neutral-500">No devices remembered yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {devices.map((device) => (
            <li key={device.id} className="flex h-12 items-center justify-between gap-2 rounded border border-white/5 px-2">
              <span className="min-w-0 truncate text-sm font-semibold text-white">{device.name}</span>
              <button
                type="button"
                onClick={() => onForget(device.id)}
                className="h-8 shrink-0 rounded border border-white/15 px-2 text-xs text-neutral-300 hover:bg-white/5"
              >
                Forget
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RemoteSettingsPanel({
  serverOnline,
  status,
  rememberedDevices,
  rememberDevices,
  onForgetDevice,
  onToggleEnabled,
  onToggleAccepting,
  onSetMode,
  onRegeneratePin,
  onDisconnectRemote,
  onDisconnectAll,
  onUpdatePermission,
}: RemoteSettingsPanelProps) {
  if (!serverOnline || !status) {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          The local remote-control server isn't reachable. Mobile remotes need it to connect. Start it with{' '}
          <code className="rounded bg-black/40 px-1">npm start</code> (or{' '}
          <code className="rounded bg-black/40 px-1">npm run dev:all</code> during development).
        </p>
        <p className="text-xs text-neutral-500">
          Everything else in BidBoard — the bidder list, the operator console, and the full screen display — works
          normally without this server.
        </p>
        <RememberedDevices devices={rememberedDevices} enabled={rememberDevices} onForget={onForgetDevice} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded border border-white/10 p-3">
        <div>
          <div className="text-sm font-semibold text-white">Remote Access</div>
          <div className="text-xs text-neutral-500">Allow phones and tablets to connect as remotes.</div>
        </div>
        <button
          type="button"
          onClick={() => onToggleEnabled(!status.remoteAccessEnabled)}
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
            status.remoteAccessEnabled ? 'bg-green-500/20 text-green-300' : 'bg-neutral-700/40 text-neutral-400'
          }`}
        >
          {status.remoteAccessEnabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      {status.remoteAccessEnabled && (
        <>
          <div className="grid grid-cols-2 gap-4 rounded border border-white/10 p-3">
            <div>
              <div className="text-xs text-neutral-400">Session PIN</div>
              <div className="text-2xl font-bold tracking-widest text-white">{status.pin}</div>
              <button
                type="button"
                onClick={onRegeneratePin}
                className="mt-1 rounded border border-white/15 px-2 py-1 text-xs text-neutral-300 hover:bg-white/5"
              >
                Regenerate PIN
              </button>
            </div>
            <div>
              <div className="text-xs text-neutral-400">Scan to connect. This code stays with the open event when the PIN changes.</div>
              {status.qrDataUrl ? (
                <img src={status.qrDataUrl} alt="Remote connection QR code" className="mt-1 h-40 w-40 rounded bg-white p-1" />
              ) : (
                <p className="text-xs text-neutral-500">No local network address detected.</p>
              )}
            </div>
          </div>

          <div className="rounded border border-white/10 p-3 text-xs text-neutral-400">
            <div>
              Remote URL: <span className="text-neutral-200">{status.remoteUrl ?? 'unavailable'}</span>
            </div>
            {status.localIps.length > 0 && (
              <div className="mt-1">
                Detected addresses: <span className="text-neutral-200">{status.localIps.join(', ')}</span>
              </div>
            )}
            <div className="mt-1">
              Connected remotes: <span className="text-neutral-200">{status.remotes.length}</span>
            </div>
            <div className="mt-1">A phone opens the keypad. A larger screen opens the tablet view. Either device can switch.</div>
          </div>

          <label className="flex items-center justify-between rounded border border-white/10 p-3 text-sm text-neutral-300">
            Stop accepting new connections
            <input
              type="checkbox"
              checked={!status.acceptingNewConnections}
              onChange={(e) => onToggleAccepting(!e.target.checked)}
            />
          </label>

          <div className="rounded border border-white/10 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Remote Mode</div>
            <div className="flex flex-col gap-2">
              {MODES.map((m) => (
                <label key={m.value} className="flex items-start gap-2 text-sm text-neutral-300">
                  <input
                    type="radio"
                    className="mt-1"
                    checked={status.remoteMode === m.value}
                    onChange={() => onSetMode(m.value)}
                  />
                  <span>
                    <span className="font-semibold text-white">{m.label}</span>
                    <span className="block text-xs text-neutral-500">{m.blurb}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <p className="rounded border border-white/10 p-3 text-sm text-neutral-400">
            The Clear key on a phone clears the full screen display. A view-only phone cannot clear it.
          </p>

          <div className="rounded border border-white/10 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Connected Remotes ({status.remotes.length})
              </span>
              {status.remotes.length > 0 && (
                <button
                  type="button"
                  onClick={onDisconnectAll}
                  className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                >
                  Disconnect All
                </button>
              )}
            </div>
            {status.remotes.length === 0 ? (
              <p className="text-sm text-neutral-500">No remotes connected.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {status.remotes.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 rounded border border-white/5 p-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{r.name}</div>
                      <div className="text-xs text-neutral-500">
                        Connected {new Date(r.connectedAt).toLocaleTimeString()} · Last active{' '}
                        {new Date(r.lastActivityAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <select
                        value={r.permission}
                        onChange={(e) => onUpdatePermission(r.id, e.target.value as RemotePermission)}
                        className="rounded border border-white/15 bg-black/40 px-1 py-1 text-xs text-white"
                      >
                        {PERMISSIONS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => onDisconnectRemote(r.id)}
                        className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                      >
                        Disconnect
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <RememberedDevices devices={rememberedDevices} enabled={rememberDevices} onForget={onForgetDevice} />
        </>
      )}
    </div>
  );
}
