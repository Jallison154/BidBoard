import { v4 as uuid } from 'uuid';
import type { Bidder, BidBoardEvent, DisplayPresetId, DisplaySettings, SafetySettings } from '../types';

export const DEFAULT_SAFETY: SafetySettings = {
  requireConfirmUnknownBidder: false,
  requireConfirmClear: false,
  disableAutoShowOnDuplicates: true,
  lockDisplaySettings: false,
  lockBidderList: false,
};

export const DISPLAY_PRESETS: Record<Exclude<DisplayPresetId, 'custom'>, DisplaySettings> = {
  'bidboard-dark': {
    presetId: 'bidboard-dark',
    backgroundColor: '#050507',
    numberColor: '#ffffff',
    nameColor: '#e5e7eb',
    accentColor: '#2f6bff',
    fontFamily: 'system-ui, sans-serif',
    numberWeight: 800,
    nameWeight: 600,
    textAlign: 'center',
    numberSize: 1,
    nameSize: 1,
    spacing: 1,
    logoSize: 1,
    logoPosition: 'top-center',
    showLogo: true,
    eventTitle: 'BidBoard',
    eventSubtitle: '',
    showEventTitle: false,
    showBidderNumber: true,
    showBidderName: true,
    showCompany: true,
    transition: 'quick-fade',
    waitingStyle: 'logo',
    waitingMessage: 'Welcome',
    clearBehavior: 'waiting',
  },
  'clean-white': {
    presetId: 'clean-white',
    backgroundColor: '#ffffff',
    numberColor: '#0a0a0f',
    nameColor: '#374151',
    accentColor: '#2f6bff',
    fontFamily: 'system-ui, sans-serif',
    numberWeight: 800,
    nameWeight: 600,
    textAlign: 'center',
    numberSize: 1,
    nameSize: 1,
    spacing: 1,
    logoSize: 1,
    logoPosition: 'top-center',
    showLogo: true,
    eventTitle: 'BidBoard',
    eventSubtitle: '',
    showEventTitle: false,
    showBidderNumber: true,
    showBidderName: true,
    showCompany: true,
    transition: 'quick-fade',
    waitingStyle: 'logo',
    waitingMessage: 'Welcome',
    clearBehavior: 'waiting',
  },
  'event-gold': {
    presetId: 'event-gold',
    backgroundColor: '#0b0906',
    numberColor: '#f5d78e',
    nameColor: '#fdf6e3',
    accentColor: '#caa14b',
    fontFamily: 'Georgia, "Times New Roman", serif',
    numberWeight: 700,
    nameWeight: 500,
    textAlign: 'center',
    numberSize: 1,
    nameSize: 1,
    spacing: 1.1,
    logoSize: 1,
    logoPosition: 'top-center',
    showLogo: true,
    eventTitle: 'Annual Benefit Auction',
    eventSubtitle: '',
    showEventTitle: true,
    showBidderNumber: true,
    showBidderName: true,
    showCompany: true,
    transition: 'fade',
    waitingStyle: 'event-title',
    waitingMessage: 'Welcome',
    clearBehavior: 'waiting',
  },
  'high-contrast': {
    presetId: 'high-contrast',
    backgroundColor: '#000000',
    numberColor: '#ffff00',
    nameColor: '#ffffff',
    accentColor: '#ffff00',
    fontFamily: 'system-ui, sans-serif',
    numberWeight: 900,
    nameWeight: 700,
    textAlign: 'center',
    numberSize: 1.1,
    nameSize: 1,
    spacing: 1,
    logoSize: 1,
    logoPosition: 'top-center',
    showLogo: false,
    eventTitle: 'BidBoard',
    eventSubtitle: '',
    showEventTitle: false,
    showBidderNumber: true,
    showBidderName: true,
    showCompany: true,
    transition: 'none',
    waitingStyle: 'blank',
    waitingMessage: 'Welcome',
    clearBehavior: 'waiting',
  },
};

export function defaultDisplaySettings(): DisplaySettings {
  return { ...DISPLAY_PRESETS['bidboard-dark'] };
}

export const DEMO_BIDDERS: Array<Pick<Bidder, 'number' | 'displayName'>> = [
  { number: '101', displayName: 'Alex Johnson' },
  { number: '154', displayName: 'Mountain View Construction' },
  { number: '203', displayName: 'Maria Garcia' },
  { number: '254', displayName: 'John & Sarah Smith' },
  { number: '312', displayName: 'Billings Community Foundation' },
];

export function makeBidder(number: string, displayName: string, company?: string): Bidder {
  const now = Date.now();
  return {
    id: uuid(),
    number,
    displayName,
    company,
    createdAt: now,
    updatedAt: now,
  };
}

export function createEvent(name: string, options?: { withDemoBidders?: boolean }): BidBoardEvent {
  const now = Date.now();
  return {
    id: uuid(),
    name,
    bidders: options?.withDemoBidders
      ? DEMO_BIDDERS.map((b) => makeBidder(b.number, b.displayName))
      : [],
    displaySettings: defaultDisplaySettings(),
    safety: { ...DEFAULT_SAFETY },
    history: [],
    autoShow: false,
    createdAt: now,
    updatedAt: now,
  };
}
