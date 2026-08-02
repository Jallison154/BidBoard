export interface Bidder {
  id: string;
  /** Raw bidder number as entered/imported, preserving leading zeros and case. */
  number: string;
  displayName: string;
  company?: string;
  createdAt: number;
  updatedAt: number;
}

export interface HistoryEntry {
  id: string;
  bidderNumber: string;
  displayName: string;
  company?: string;
  displayedAt: number;
}

export type LogoPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'center-waiting-only';

export type TransitionStyle = 'none' | 'fade' | 'quick-fade' | 'slide-up';

export type WaitingStyle = 'blank' | 'logo' | 'event-title' | 'custom-message';

export type ClearBehavior = 'waiting' | 'fade-to-black';

export type DisplayPresetId =
  | 'bidboard-dark'
  | 'clean-white'
  | 'event-gold'
  | 'high-contrast'
  | 'custom';

export interface DisplaySettings {
  presetId: DisplayPresetId;
  backgroundColor: string;
  numberColor: string;
  nameColor: string;
  accentColor: string;
  fontFamily: string;
  numberWeight: number;
  nameWeight: number;
  textAlign: 'left' | 'center' | 'right';
  numberSize: number;
  nameSize: number;
  spacing: number;
  logoDataUrl?: string;
  logoSize: number;
  logoPosition: LogoPosition;
  showLogo: boolean;
  eventTitle: string;
  eventSubtitle: string;
  showEventTitle: boolean;
  showBidderNumber: boolean;
  showBidderName: boolean;
  showCompany: boolean;
  transition: TransitionStyle;
  waitingStyle: WaitingStyle;
  waitingMessage: string;
  clearBehavior: ClearBehavior;
}

export interface SafetySettings {
  requireConfirmUnknownBidder: boolean;
  requireConfirmClear: boolean;
  disableAutoShowOnDuplicates: boolean;
  lockDisplaySettings: boolean;
  lockBidderList: boolean;
}

export interface BidBoardEvent {
  id: string;
  name: string;
  bidders: Bidder[];
  displaySettings: DisplaySettings;
  safety: SafetySettings;
  history: HistoryEntry[];
  autoShow: boolean;
  autoClearEnabled: boolean;
  autoClearSeconds: number;
  createdAt: number;
  updatedAt: number;
}

/** Portable export/import format for a single event (.bidboard.json). */
export interface BidBoardEventFile {
  fileFormat: 'bidboard-event';
  formatVersion: 1;
  event: BidBoardEvent;
}

export interface ImportColumnMapping {
  numberColumn: string;
  nameColumns: string[];
  companyColumn?: string;
  nameCombineMode: 'person' | 'company' | 'person-and-company' | 'custom';
}

export interface ImportRow {
  [column: string]: string;
}

export interface ImportWarning {
  type: 'missing-number' | 'missing-name' | 'duplicate-number' | 'empty-row';
  message: string;
  rowIndex?: number;
}

export interface ImportResult {
  bidders: Bidder[];
  warnings: ImportWarning[];
  duplicateNumbers: Map<string, Bidder[]>;
  totalRows: number;
  importedCount: number;
}

/** Messages exchanged between the operator window and the audience window. */
export type AudienceRole = 'audience' | 'audience-preview';

export type DisplayChannelMessage =
  | { kind: 'hello'; from: AudienceRole; ts: number }
  | { kind: 'heartbeat'; from: AudienceRole | 'operator'; ts: number; resolution?: { width: number; height: number } }
  | {
      kind: 'show';
      bidderNumber: string;
      displayName: string;
      company?: string;
      ts: number;
    }
  | { kind: 'clear'; ts: number }
  | { kind: 'settings'; settings: DisplaySettings; ts: number }
  | {
      kind: 'state-sync';
      settings: DisplaySettings;
      current: { bidderNumber: string; displayName: string; company?: string } | null;
      ts: number;
    };

export interface AudienceCurrentBidder {
  bidderNumber: string;
  displayName: string;
  company?: string;
}
