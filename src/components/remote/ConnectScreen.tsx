import { useState } from 'react';
import logo from '../../assets/bidboard-logo.png';
import type { ConnectionStatus } from '../../hooks/useRemoteConnection';

interface ConnectScreenProps {
  status: ConnectionStatus;
  rejection: string | null;
  deviceName: string;
  onSetDeviceName: (name: string) => void;
  hasToken: boolean;
  onConnect: (auth: { pin?: string; token?: string }) => void;
  token: string | null;
}

export function ConnectScreen({ status, rejection, deviceName, onSetDeviceName, hasToken, onConnect, token }: ConnectScreenProps) {
  const [pin, setPin] = useState('');
  const [nameDraft, setNameDraft] = useState(deviceName);

  const submit = () => {
    onSetDeviceName(nameDraft.trim() || deviceName);
    if (hasToken && token) {
      onConnect({ token });
    } else {
      onConnect({ pin: pin.trim() });
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-neutral-950 px-6 py-10 text-neutral-100">
      <img src={logo} alt="BidBoard" className="h-12 w-auto" />

      <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-white/10 bg-neutral-900/60 p-5">
        <div className="text-center text-sm text-neutral-400">
          {status === 'connecting' && 'Connecting to BidBoard…'}
          {status === 'disconnected' && "Can't reach the BidBoard server on this network."}
          {(status === 'connected' || status === 'reconnecting') && 'Enter this device on the BidBoard remote.'}
        </div>

        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Your name (shown to the operator)
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="e.g. Auctioneer, Spotter, Table Captain"
            className="rounded border border-white/15 bg-black/40 px-3 py-3 text-base text-white outline-none focus:border-blue-500"
          />
        </label>

        {hasToken ? (
          <p className="rounded border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-center text-xs text-blue-300">
            Joining via QR code — no PIN needed.
          </p>
        ) : (
          <label className="flex flex-col gap-1 text-xs text-neutral-400">
            Session PIN
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="off"
              placeholder="000000"
              className="rounded border border-white/15 bg-black/40 px-3 py-3 text-center text-2xl tracking-[0.3em] text-white outline-none focus:border-blue-500"
            />
          </label>
        )}

        {rejection && <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-300">{rejection}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={status === 'disconnected' || (!hasToken && pin.trim().length === 0)}
          className="min-h-12 rounded-md bg-blue-600 text-base font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-900 disabled:text-blue-300/50"
        >
          Connect
        </button>
      </div>
    </div>
  );
}
