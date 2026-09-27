import Papa from 'papaparse';
import type { Bidder } from '../types';

export interface HistoryExportRow {
  bidderNumber: string;
  displayName: string;
  company?: string;
  displayedAt: number;
}

export function bidderListToCsv(bidders: Bidder[]): string {
  const rows = bidders.map((b) => ({
    'Bidder Number': b.number,
    'Display Name': b.displayName,
    Company: b.company ?? '',
  }));
  return Papa.unparse(rows);
}

export function downloadBidderListCsv(bidders: Bidder[], filename: string): void {
  downloadCsv(bidderListToCsv(bidders), filename);
}

export function historyToCsv(entries: HistoryExportRow[]): string {
  const rows = entries.map((entry) => ({
    'Bidder Number': entry.bidderNumber,
    'Display Name': entry.displayName,
    Company: entry.company ?? '',
    'Displayed At': new Date(entry.displayedAt).toLocaleString(),
  }));
  return Papa.unparse(rows);
}

export function downloadHistoryCsv(entries: HistoryExportRow[], filename: string): void {
  downloadCsv(historyToCsv(entries), filename);
}

export function historyExportName(eventName: string): string {
  const safe = eventName.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'bidboard';
  return `${safe}-history`;
}

function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
