import type { Bidder } from '../types';
import { normalizeBidderNumber } from './normalize';

export interface BidderMatch {
  exact: Bidder[];
}

/** Finds all bidders whose normalized number matches the query. Returns every
 * match so callers can detect and surface duplicates instead of silently
 * picking one. */
export function findBidders(bidders: Bidder[], query: string): Bidder[] {
  const target = normalizeBidderNumber(query);
  if (!target) return [];
  return bidders.filter((b) => normalizeBidderNumber(b.number) === target);
}

/** Groups bidders by normalized number, returning only groups with more than
 * one entry (duplicates). */
export function findDuplicateNumbers(bidders: Bidder[]): Map<string, Bidder[]> {
  const groups = new Map<string, Bidder[]>();
  for (const bidder of bidders) {
    const key = normalizeBidderNumber(bidder.number);
    if (!key) continue;
    const group = groups.get(key);
    if (group) {
      group.push(bidder);
    } else {
      groups.set(key, [bidder]);
    }
  }
  for (const key of [...groups.keys()]) {
    if (groups.get(key)!.length < 2) groups.delete(key);
  }
  return groups;
}

export function sortBidders(bidders: Bidder[]): Bidder[] {
  return [...bidders].sort((a, b) =>
    normalizeBidderNumber(a.number).localeCompare(normalizeBidderNumber(b.number), undefined, {
      numeric: true,
    }),
  );
}

export function searchBiddersByText(bidders: Bidder[], query: string): Bidder[] {
  const q = query.trim().toLowerCase();
  if (!q) return sortBidders(bidders);
  return sortBidders(
    bidders.filter(
      (b) =>
        b.number.toLowerCase().includes(q) ||
        b.displayName.toLowerCase().includes(q) ||
        (b.company ?? '').toLowerCase().includes(q),
    ),
  );
}
