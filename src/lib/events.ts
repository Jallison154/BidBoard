import { v4 as uuid } from 'uuid';
import type { Bidder, BidBoardEvent, DisplayPresetId, DisplaySettings, EventTitleVisibility, SafetySettings } from '../types';

export const DEFAULT_SAFETY: SafetySettings = {
  requireConfirmUnknownBidder: false,
  requireConfirmClear: false,
  disableAutoShowOnDuplicates: true,
  lockDisplaySettings: false,
  lockBidderList: false,
  allowLetterNumbers: false,
  rememberDevices: true,
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
    eventTitleVisibility: 'none',
    showEventTitle: false,
    showBidderNumber: true,
    showBidderName: true,
    showCompany: true,
    transition: 'slide-up',
    waitingStyle: 'logo',
    waitingMessage: 'Welcome',
    clearBehavior: 'fade-to-black',
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
    eventTitleVisibility: 'none',
    showEventTitle: false,
    showBidderNumber: true,
    showBidderName: true,
    showCompany: true,
    transition: 'slide-up',
    waitingStyle: 'logo',
    waitingMessage: 'Welcome',
    clearBehavior: 'fade-to-black',
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
    eventTitleVisibility: 'always',
    showEventTitle: true,
    showBidderNumber: true,
    showBidderName: true,
    showCompany: true,
    transition: 'slide-up',
    waitingStyle: 'event-title',
    waitingMessage: 'Welcome',
    clearBehavior: 'fade-to-black',
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
    eventTitleVisibility: 'none',
    showEventTitle: false,
    showBidderNumber: true,
    showBidderName: true,
    showCompany: true,
    transition: 'slide-up',
    waitingStyle: 'blank',
    waitingMessage: 'Welcome',
    clearBehavior: 'fade-to-black',
  },
};

export function eventTitleVisibility(settings: DisplaySettings): EventTitleVisibility {
  if (settings.eventTitleVisibility) return settings.eventTitleVisibility;
  if (!settings.showEventTitle) return 'none';
  return settings.waitingStyle === 'event-title' ? 'always' : 'on-show';
}

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

/** A join code that stays with one event, so a printed QR keeps working for that event. */
export function newJoinToken(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createEvent(name: string, options?: { withDemoBidders?: boolean }): BidBoardEvent {
  const now = Date.now();
  return {
    id: uuid(),
    name,
    joinToken: newJoinToken(),
    bidders: options?.withDemoBidders
      ? DEMO_BIDDERS.map((b) => makeBidder(b.number, b.displayName))
      : [],
    displaySettings: defaultDisplaySettings(),
    safety: { ...DEFAULT_SAFETY },
    history: [],
    autoShow: false,
    autoClearEnabled: false,
    autoClearSeconds: 20,
    createdAt: now,
    updatedAt: now,
  };
}
