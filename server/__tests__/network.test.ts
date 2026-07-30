import { describe, expect, it } from 'vitest';
import { getLocalIPv4Addresses } from '../network';

describe('getLocalIPv4Addresses', () => {
  it('returns an array of IPv4-looking strings without throwing', () => {
    const addresses = getLocalIPv4Addresses();
    expect(Array.isArray(addresses)).toBe(true);
    for (const addr of addresses) {
      expect(addr).toMatch(/^\d{1,3}(\.\d{1,3}){3}$/);
    }
  });
});
