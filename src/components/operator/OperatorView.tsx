import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useOperatorConsole } from '../../hooks/useOperatorConsole';
import { useRemoteServer } from '../../hooks/useRemoteServer';
import { DEFAULT_SAFETY } from '../../lib/events';
import { Header } from './Header';
import { BidderConsole } from './BidderConsole';
import { RecentHistoryPanel } from './RecentHistoryPanel';
import { BidderListPanel } from './BidderListPanel';
import { AudienceStatusCard } from './AudienceStatusCard';
import { LiveOutputPreview } from './LiveOutputPreview';
import { ApprovalRequestsPanel } from './ApprovalRequestsPanel';
import { ImportWizard } from './ImportWizard';
import { SettingsPanel } from './SettingsPanel';
import { EventManager } from './EventManager';
import { KeyboardHelp } from './KeyboardHelp';
import { FirstLaunchWizard } from './FirstLaunchWizard';
import { StatusBar } from './StatusBar';
import { ConfirmDialog } from '../common/ConfirmDialog';

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
    lookupBidder: consoleApi.lookupForRemote,
    onRemoteShow: consoleApi.applyRemoteShow,
    onRemotePreview: consoleApi.applyRemotePreview,
    onRemoteClear: consoleApi.applyRemoteClear,
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [confirming, setConfirming] = useState<'clear' | 'unknown' | null>(null);

  const safety = activeEvent?.safety ?? DEFAULT_SAFETY;
  const anyModalOpen = showSettings || showEvents || showHelp || showImport || confirming !== null;

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
  }, [app.hasLaunched, consoleApi]);

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
      if (e.key === ' ' && consoleApi.inputValue === '') {
        e.preventDefault();
        consoleApi.showPreviewNow();
        return;
      }
      if ((e.key === 'c' || e.key === 'C') && consoleApi.inputValue === '') {
        e.preventDefault();
        requestClear();
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
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
      if (!isMainInput && e.key.length === 1 && /[a-zA-Z0-9-]/.test(e.key)) {
        consoleApi.focusInput();
        consoleApi.setInputValue(consoleApi.inputValue + e.key);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [anyModalOpen, consoleApi, requestClear]);

  const bidderCount = activeEvent?.bidders.length ?? 0;
  const showFirstLaunch = !app.hasLaunched;

  const sortedHistory = useMemo(() => activeEvent?.history ?? [], [activeEvent]);

  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
      <Header
        eventName={activeEvent?.name ?? ''}
        connected={consoleApi.connected}
        channelSupported={consoleApi.channelSupported}
        isLive={!!consoleApi.liveBidder}
        onOpenSettings={() => setShowSettings(true)}
        onOpenEvents={() => setShowEvents(true)}
        onOpenHelp={() => setShowHelp(true)}
      />

      <main className="flex flex-1 gap-4 overflow-hidden p-4">
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
            <div className="flex w-[420px] shrink-0 flex-col gap-4 overflow-y-auto pr-1">
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
                onRequestClear={requestClear}
                onRequestShowUnknown={requestShowUnknown}
              />
            </div>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
              <LiveOutputPreview
                connected={consoleApi.connected}
                channelSupported={consoleApi.channelSupported}
                resolution={consoleApi.resolution}
                isLive={!!consoleApi.liveBidder}
              />
              <AudienceStatusCard
                connected={consoleApi.connected}
                channelSupported={consoleApi.channelSupported}
                onOpenAudience={consoleApi.openAudienceWindow}
              />
              <RecentHistoryPanel history={sortedHistory} onRedisplay={consoleApi.redisplay} onClearHistory={app.clearHistory} />
              <BidderListPanel
                bidders={activeEvent.bidders}
                eventName={activeEvent.name}
                locked={activeEvent.safety.lockBidderList}
                onAdd={app.addBidder}
                onUpdate={app.updateBidder}
                onDelete={app.deleteBidder}
                onOpenImport={() => setShowImport(true)}
                onRemoveAll={() => app.replaceBidders([])}
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

      {confirming === 'clear' && (
        <ConfirmDialog
          title="Clear audience display?"
          message="This will remove the current bidder from the audience screen."
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
          message="This bidder number was not found in the imported list. Show it on the audience display anyway?"
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
          onSkip={app.markLaunched}
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
