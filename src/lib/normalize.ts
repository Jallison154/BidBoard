/**
 * Normalizes a bidder number for lookup/comparison purposes: trims surrounding
 * whitespace, collapses internal whitespace, and uppercases. The original,
 * unnormalized value is always preserved separately so leading zeros and
 * exact formatting (e.g. "007", "VIP-12") survive for display.
 */
export function normalizeBidderNumber(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function sanitizeText(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function isBlank(raw: string | undefined | null): boolean {
  return !raw || raw.trim().length === 0;
}
