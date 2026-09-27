import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useOperatorConsole } from '../../hooks/useOperatorConsole';
import { useRemoteServer } from '../../hooks/useRemoteServer';
import { DEFAULT_SAFETY } from '../../lib/events';
import { Header } from './Header';
import { BidderConsole } from './BidderConsole';
import { RecentHistoryPanel } from './RecentHistoryPanel';
import { BidderListPanel } from './BidderListPanel';
import { LiveOutputPreview } from './LiveOutputPreview';
import { ApprovalRequestsPanel } from './ApprovalRequestsPanel';
import { ImportWizard } from './ImportWizard';
import { SettingsPanel } from './SettingsPanel';
import { EventManager } from './EventManager';
import { KeyboardHelp } from './KeyboardHelp';
import { FirstLaunchWizard } from './FirstLaunchWizard';
import { StatusBar } from './StatusBar';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Modal } from '../common/Modal';
import { filterBidderNumber } from '../../lib/normalize';
import type { Bidder, HistoryEntry } from '../../types';
import type { RememberedDevice } from '../../shared/socketTypes';

const NO_BIDDERS: Bidder[] = [];
const NO_HISTORY: HistoryEntry[] = [];
const NO_DEVICES: RememberedDevice[] = [];

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => {
    if (char === '&') return '&amp;';
    if (char === '<') return '&lt;';
    if (char === '>') return '&gt;';
    return '&quot;';
  });
}

function printEventQr(eventName: string, qrDataUrl: string, remoteUrl: string | null) {
  const popup = window.open('', 'bidboard-event-qr', 'width=520,height=720');
  if (!popup) return;
  const name = escapeHtml(eventName || 'BidBoard');
  const url = escapeHtml(remoteUrl ?? '');
  popup.document.write(`<!doctype html>
<html>
  <head>
    <title>${name}</title>
    <style>
      body { font-family: system-ui, sans-serif; text-align: center; margin: 48px; color: #111; }
      img { width: 360px; height: 360px; }
      h1 { font-size: 32px; margin: 8px 0 24px; }
      p { font-size: 16px; }
      .url { font-size: 12px; word-break: break-all; color: #444; }
    </style>
  </head>
  <body>
    <p>BidBoard</p>
    <h1>${name}</h1>
    <img src="${qrDataUrl}" alt="QR code for ${name}" />
    <p>Scan to connect a phone or tablet to this event.</p>
    <p class="url">${url}</p>
  </body>
</html>`);
  popup.document.close();
  popup.focus();
  window.setTimeout(() => popup.print(), 200);
}

function isEditableElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable;
}

export function OperatorView() {
  const app = useApp();
  const { activeEvent } = app;
  const consoleApi = useOperatorConsole();
  const remote = useRemoteServer({
    liveBidder: consoleApi.liveBidder,
    eventName: activeEvent?.name ?? '',
    joinToken: activeEvent?.joinToken ?? '',
    bidders: activeEvent?.bidders ?? NO_BIDDERS,
    history: activeEvent?.history ?? NO_HISTORY,
    allowLetterNumbers: activeEvent?.safety.allowLetterNumbers === true,
    rememberDevices: activeEvent ? activeEvent.safety.rememberDevices !== false : false,
    rememberedDevices: activeEvent?.rememberedDevices ?? NO_DEVICES,
    onRememberDevice: app.rememberDevice,
    lookupBidder: consoleApi.lookupForRemote,
    onRemoteShow: consoleApi.applyRemoteShow,
    onRemotePreview: consoleApi.applyRemotePreview,
    onRemoteClear: consoleApi.applyRemoteClear,
  });

  const [showSettings, setShowSettings] = useState(
    () => new URLSearchParams(window.location.search).get('settings') === '1',
  );
  const [showEvents, setShowEvents] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showMobileConnect, setShowMobileConnect] = useState(false);
  const [confirming, setConfirming] = useState<'clear' | 'unknown' | null>(null);

  const safety = activeEvent?.safety ?? DEFAULT_SAFETY;
  const anyModalOpen = showSettings || showEvents || showHelp || showImport || showMobileConnect || confirming !== null;

  const requestClear = useCallback(() => {
    if (safety.requireConfirmClear) setConfirming('clear');
    else consoleApi.clearDisplayNow();
  }, [safety, consoleApi]);

  const requestShowUnknown = useCallback(() => {
    if (safety.requireConfirmUnknownBidder) setConfirming('unknown');
    else consoleApi.showUnknownNow();
  }, [safety, consoleApi]);

  useEffect(() => {
    if (!app.hasLaunched) return;
    consoleApi.focusInput();
    // Focus the bidder box once when the console is ready. Depending on the
    // whole console object refocused it on every update, which pulled the
    // cursor out of Settings and Add Bidder.
  }, [app.hasLaunched, consoleApi.focusInput]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (anyModalOpen) return;
      const active = document.activeElement;
      const isMainInput = active === consoleApi.inputRef.current;
      if (isEditableElement(active) && !isMainInput) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        consoleApi.handleEscape();
        return;
      }
      if (e.key === 'Enter' && !isMainInput) {
        e.preventDefault();
        consoleApi.focusInput();
        consoleApi.handleEnterKey();
        return;
      }
      const stagedNumber =
        consoleApi.status.kind === 'preview' ? consoleApi.status.bidder.number : '';
      const inputMatchesStage =
        stagedNumber !== '' &&
        consoleApi.inputValue.trim().toUpperCase() === stagedNumber.trim().toUpperCase();
      if (e.key === ' ' && (consoleApi.inputValue === '' || inputMatchesStage)) {
        e.preventDefault();
        consoleApi.showPreviewNow();
        return;
      }
      if (!isMainInput && (e.key === 'c' || e.key === 'C') && consoleApi.inputValue === '') {
        e.preventDefault();
        requestClear();
        return;
      }
      if (!isMainInput && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        consoleApi.openAudienceWindow();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        consoleApi.cycleHistory(1);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        consoleApi.cycleHistory(-1);
        return;
      }
      const typed = filterBidderNumber(e.key, safety.allowLetterNumbers === true);
      if (!isMainInput && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && typed) {
        e.preventDefault();
        consoleApi.focusInput();
        consoleApi.setInputValue((current) => current + typed);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [anyModalOpen, consoleApi, requestClear, safety.allowLetterNumbers]);

  const bidderCount = activeEvent?.bidders.length ?? 0;
  const showFirstLaunch = !app.hasLaunched;

  const sortedHistory = useMemo(() => activeEvent?.history ?? [], [activeEvent]);

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-neutral-950 text-neutral-100">
      <Header
        eventName={activeEvent?.name ?? ''}
        connected={consoleApi.connected}
        channelSupported={consoleApi.channelSupported}
        isLive={!!consoleApi.liveBidder}
        onOpenSettings={() => setShowSettings(true)}
        onOpenEvents={() => setShowEvents(true)}
        onOpenHelp={() => setShowHelp(true)}
        onOpenMobile={() => {
          setShowMobileConnect(true);
          if (remote.serverOnline && remote.status && !remote.status.remoteAccessEnabled) {
            remote.updateSettings({ remoteAccessEnabled: true });
          }
        }}
      />

      <main className="flex min-h-0 flex-1 gap-4 overflow-auto p-4">
        {!activeEvent ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="text-neutral-400">No event is selected yet.</p>
            <button
              type="button"
              onClick={() => setShowEvents(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Create or Open an Event
            </button>
          </div>
        ) : (
          <>
            <div className="flex min-h-0 min-w-[18rem] flex-[1.15] flex-col gap-4">
              <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
              <ApprovalRequestsPanel
                requests={remote.status?.pendingRequests ?? []}
                onApproveShow={(request) => {
                  consoleApi.applyRemoteShow(request.bidderNumber, request.displayName, request.company);
                  remote.approveRequest(request.id, 'show');
                }}
                onApprovePreview={(request) => {
                  consoleApi.applyRemotePreview(request.bidderNumber, request.displayName, request.company);
                  remote.approveRequest(request.id, 'preview');
                }}
                onReject={(request) => remote.rejectRequest(request.id)}
              />
              <BidderConsole
                console={consoleApi}
                autoShow={activeEvent.autoShow}
                onSetAutoShow={app.setAutoShow}
                autoClearEnabled={activeEvent.autoClearEnabled ?? false}
                autoClearSeconds={activeEvent.autoClearSeconds ?? 20}
                onSetAutoClearEnabled={app.setAutoClearEnabled}
                onSetAutoClearSeconds={app.setAutoClearSeconds}
                onRequestClear={requestClear}
                onRequestShowUnknown={requestShowUnknown}
                allowLetterNumbers={safety.allowLetterNumbers === true}
              />
              </div>
              <LiveOutputPreview
                connected={consoleApi.connected}
                channelSupported={consoleApi.channelSupported}
                resolution={consoleApi.resolution}
                isLive={!!consoleApi.liveBidder}
                autoClearDeadline={consoleApi.autoClearDeadline}
                onOpenAudience={consoleApi.openAudienceWindow}
              />
            </div>

            <div className="flex min-h-0 min-w-[16rem] flex-1 flex-col">
              <RecentHistoryPanel
                history={sortedHistory}
                eventName={activeEvent.name}
                onRedisplay={consoleApi.redisplay}
                onClearHistory={app.clearHistory}
              />
            </div>

            <div className="flex min-h-0 min-w-[16rem] flex-[1.2] flex-col">
              <BidderListPanel
                bidders={activeEvent.bidders}
                eventName={activeEvent.name}
                locked={activeEvent.safety.lockBidderList}
                onAdd={app.addBidder}
                onUpdate={app.updateBidder}
                onDelete={app.deleteBidder}
                onOpenImport={() => setShowImport(true)}
                onRemoveAll={() => app.replaceBidders([])}
                onPreview={consoleApi.selectMatch}
                allowLetterNumbers={activeEvent.safety.allowLetterNumbers === true}
              />
            </div>
          </>
        )}
      </main>

      <StatusBar bidderCount={bidderCount} eventName={activeEvent?.name ?? ''} />

      {showImport && activeEvent && (
        <ImportWizard
          existingBidders={activeEvent.bidders}
          onClose={() => setShowImport(false)}
          onImport={(bidders, mode) => (mode === 'replace' ? app.replaceBidders(bidders) : app.addBidders(bidders))}
        />
      )}

      {showSettings && activeEvent && (
        <SettingsPanel
          settings={activeEvent.displaySettings}
          safety={activeEvent.safety}
          rememberedDevices={activeEvent.rememberedDevices ?? NO_DEVICES}
          onForgetDevice={(deviceId) => {
            app.forgetDevice(deviceId);
            remote.forgetRememberedDevice(deviceId);
          }}
          onUpdateSettings={app.updateDisplaySettings}
          onApplyPreset={app.applyPreset}
          onUpdateSafety={app.updateSafety}
          onClose={() => setShowSettings(false)}
          remote={remote}
        />
      )}

      {showEvents && (
        <EventManager
          events={app.allEvents}
          activeEventId={activeEvent?.id ?? null}
          onNew={app.newEvent}
          onSwitch={(id) => {
            app.switchEvent(id);
            setShowEvents(false);
          }}
          onRename={app.renameEvent}
          onDuplicate={app.duplicateEvent}
          onDelete={app.deleteEvent}
          onExport={app.exportEvent}
          onImportFile={app.importEventFile}
          onClose={() => setShowEvents(false)}
        />
      )}

      {showHelp && <KeyboardHelp onClose={() => setShowHelp(false)} />}

      {showMobileConnect && (
        <Modal title="Mobile Connect" onClose={() => setShowMobileConnect(false)}>
          {!remote.serverOnline || !remote.status ? (
            <p className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              The local server isn't reachable, so a phone or tablet can't join yet. Start BidBoard with the server running.
            </p>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-center text-sm text-neutral-400">
                {activeEvent
                  ? `This code is locked to ${activeEvent.name}. Print it and phones can keep using it for this event while BidBoard is open on this computer. When the address changes to a web link, print the new code for the same event.`
                  : 'Open an event to print a code that stays with it.'}
              </p>
              {remote.status.qrDataUrl ? (
                <img
                  src={remote.status.qrDataUrl}
                  alt="Mobile connection QR code"
                  className="h-64 w-64 rounded bg-white p-2"
                />
              ) : (
                <p className="text-sm text-neutral-500">No local network address detected.</p>
              )}
              {remote.status.qrDataUrl && activeEvent && (
                <button
                  type="button"
                  onClick={() =>
                    printEventQr(activeEvent.name, remote.status?.qrDataUrl ?? '', remote.status?.remoteUrl ?? null)
                  }
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  Print this code
                </button>
              )}
              <div className="text-center">
                <div className="text-xs text-neutral-400">Session PIN</div>
                <div className="text-3xl font-bold tracking-widest text-white">{remote.status.pin}</div>
              </div>
              {remote.status.remoteUrl && (
                <p className="w-full truncate text-center text-xs text-neutral-500">{remote.status.remoteUrl}</p>
              )}
            </div>
          )}
        </Modal>
      )}

      {confirming === 'clear' && (
        <ConfirmDialog
          title="Clear full screen display?"
          message="This will remove the current bidder from the full screen display."
          confirmLabel="Clear"
          danger
          onConfirm={() => {
            consoleApi.clearDisplayNow();
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}

      {confirming === 'unknown' && (
        <ConfirmDialog
          title="Display unknown bidder?"
          message="This bidder number was not found in the imported list. Show it on the full screen display anyway?"
          confirmLabel="Show Anyway"
          onConfirm={() => {
            consoleApi.showUnknownNow();
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}

      {showFirstLaunch && (
        <FirstLaunchWizard
          onSkip={() => {
            app.newEvent('My Auction', true);
            app.markLaunched();
          }}
          onDone={({ openImport, openAudience }) => {
            app.markLaunched();
            if (openAudience) consoleApi.openAudienceWindow();
            if (openImport) setShowImport(true);
          }}
        />
      )}
    </div>
  );
}
