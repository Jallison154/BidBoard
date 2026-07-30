import { describe, expect, it } from 'vitest';
import { isBlank, normalizeBidderNumber, sanitizeText } from '../normalize';

describe('normalizeBidderNumber', () => {
  it('preserves leading zeros in the visible value while normalizing for comparison', () => {
    expect(normalizeBidderNumber('007')).toBe('007');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeBidderNumber('  254  ')).toBe('254');
  });

  it('collapses internal whitespace', () => {
    expect(normalizeBidderNumber('VIP  12')).toBe('VIP 12');
  });

  it('is case-insensitive for alphanumeric numbers', () => {
    expect(normalizeBidderNumber('vip-12')).toBe(normalizeBidderNumber('VIP-12'));
  });

  it('treats different leading-zero values as distinct', () => {
    expect(normalizeBidderNumber('7')).not.toBe(normalizeBidderNumber('007'));
  });
});

describe('sanitizeText', () => {
  it('trims and collapses whitespace without changing case', () => {
    expect(sanitizeText('  John   Smith  ')).toBe('John Smith');
  });
});

describe('isBlank', () => {
  it('treats empty and whitespace-only strings as blank', () => {
    expect(isBlank('')).toBe(true);
    expect(isBlank('   ')).toBe(true);
    expect(isBlank(undefined)).toBe(true);
    expect(isBlank(null)).toBe(true);
  });

  it('treats non-empty strings as not blank', () => {
    expect(isBlank('254')).toBe(false);
  });
});
