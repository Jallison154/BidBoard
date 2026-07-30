import { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAudienceChannel } from '../../hooks/useDisplayChannel';
import { defaultDisplaySettings } from '../../lib/events';
import { DisplayStage } from './DisplayStage';

interface AudienceViewProps {
  embedded?: boolean;
}

export function AudienceView({ embedded = false }: AudienceViewProps) {
  const { activeEvent } = useApp();
  const initialSettings = activeEvent?.displaySettings ?? defaultDisplaySettings();
  const { settings, current, stage } = useAudienceChannel(initialSettings, embedded ? 'audience-preview' : 'audience');

  useEffect(() => {
    if (!embedded) document.title = 'BidBoard — Audience Display';
  }, [embedded]);

  return <DisplayStage settings={settings} current={current} stage={stage} />;
}
