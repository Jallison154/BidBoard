import Papa from 'papaparse';
import type { Bidder } from '../types';

export function bidderListToCsv(bidders: Bidder[]): string {
  const rows = bidders.map((b) => ({
    'Bidder Number': b.number,
    'Display Name': b.displayName,
    Company: b.company ?? '',
  }));
  return Papa.unparse(rows);
}

export function downloadBidderListCsv(bidders: Bidder[], filename: string): void {
  const csv = bidderListToCsv(bidders);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
