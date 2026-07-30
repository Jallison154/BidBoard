import { useRef } from 'react';
import type { AudienceCurrentBidder, DisplaySettings } from '../../types';
import type { AudienceStage } from '../../hooks/useDisplayChannel';
import { useAutoFitText } from '../../hooks/useAutoFitText';
import './audience.css';

interface DisplayStageProps {
  settings: DisplaySettings;
  current: AudienceCurrentBidder | null;
  stage: AudienceStage;
}

function Logo({ settings, position, big }: { settings: DisplaySettings; position: string; big?: boolean }) {
  if (!settings.showLogo || !settings.logoDataUrl) return null;
  const style = { '--bb-logo-scale': settings.logoSize } as React.CSSProperties;
  return (
    <img
      src={settings.logoDataUrl}
      alt=""
      style={style}
      className={big ? 'bb-logo bb-logo-center' : `bb-logo bb-logo-${position}`}
    />
  );
}

function WaitingContent({ settings }: { settings: DisplaySettings }) {
  const showCornerLogo = settings.showLogo && settings.logoPosition !== 'center-waiting-only' && settings.waitingStyle !== 'logo';
  const showCenterLogo =
    settings.showLogo && (settings.waitingStyle === 'logo' || settings.logoPosition === 'center-waiting-only');

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 px-8">
      {showCornerLogo && <Logo settings={settings} position={settings.logoPosition} />}
      {showCenterLogo && <Logo settings={settings} position={settings.logoPosition} big />}
      {settings.waitingStyle === 'event-title' && settings.showEventTitle && (
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="bb-event-title">{settings.eventTitle}</div>
          {settings.eventSubtitle && <div className="bb-event-subtitle">{settings.eventSubtitle}</div>}
        </div>
      )}
      {settings.waitingStyle === 'custom-message' && (
        <div className="bb-waiting-message">{settings.waitingMessage}</div>
      )}
    </div>
  );
}

function BidderContent({ settings, current }: { settings: DisplaySettings; current: AudienceCurrentBidder }) {
  const nameRef = useRef<HTMLHeadingElement>(null);
  useAutoFitText(nameRef, current.displayName, { minPx: 28, maxPx: 160, step: 4 });
  const align = settings.textAlign === 'left' ? 'items-start text-left' : settings.textAlign === 'right' ? 'items-end text-right' : 'items-center text-center';

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-8">
      {settings.showLogo && settings.logoPosition !== 'center-waiting-only' && (
        <Logo settings={settings} position={settings.logoPosition} />
      )}
      {settings.showEventTitle && (
        <div className="absolute top-8 flex flex-col items-center text-center">
          <div className="bb-event-title">{settings.eventTitle}</div>
          {settings.eventSubtitle && <div className="bb-event-subtitle">{settings.eventSubtitle}</div>}
        </div>
      )}
      <div className={`flex flex-col ${align} gap-[calc(1rem*var(--bb-spacing))]`}>
        {settings.showBidderNumber && <h1 className="bb-number">{current.bidderNumber}</h1>}
        {settings.showBidderName && (
          <h2 ref={nameRef} className="bb-name">
            {current.displayName || ' '}
          </h2>
        )}
        {settings.showCompany && current.company && <p className="bb-company">{current.company}</p>}
      </div>
    </div>
  );
}

export function DisplayStage({ settings, current, stage }: DisplayStageProps) {
  const cssVars = {
    '--bb-bg': settings.backgroundColor,
    '--bb-number-color': settings.numberColor,
    '--bb-name-color': settings.nameColor,
    '--bb-accent': settings.accentColor,
    '--bb-font': settings.fontFamily,
    '--bb-number-weight': settings.numberWeight,
    '--bb-name-weight': settings.nameWeight,
    '--bb-number-scale': settings.numberSize,
    '--bb-name-scale': settings.nameSize,
    '--bb-spacing': settings.spacing,
  } as React.CSSProperties;

  const showingBidder = stage === 'bidder' && current;
  const showBlackout = stage === 'cleared' && settings.clearBehavior === 'fade-to-black';
  const transitionClass = `bb-transition-${settings.transition}`;
  const contentKey = showingBidder ? `bidder-${current.bidderNumber}-${current.displayName}` : `waiting-${stage}`;

  return (
    <div className="bb-audience-stage" style={cssVars}>
      <div key={contentKey} className={`h-full w-full ${transitionClass}`}>
        {showBlackout ? null : showingBidder ? (
          <BidderContent settings={settings} current={current} />
        ) : (
          <WaitingContent settings={settings} />
        )}
      </div>
    </div>
  );
}
