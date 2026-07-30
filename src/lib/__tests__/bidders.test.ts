import { describe, expect, it } from 'vitest';
import { findBidders, findDuplicateNumbers, searchBiddersByText, sortBidders } from '../bidders';
import { makeBidder } from '../events';

describe('findBidders', () => {
  it('finds a bidder by exact number', () => {
    const bidders = [makeBidder('254', 'John & Sarah Smith'), makeBidder('101', 'Alex Johnson')];
    expect(findBidders(bidders, '254')).toHaveLength(1);
    expect(findBidders(bidders, '254')[0].displayName).toBe('John & Sarah Smith');
  });

  it('matches leading-zero numbers exactly, not numerically', () => {
    const bidders = [makeBidder('007', 'Agent Bond'), makeBidder('7', 'Plain Seven')];
    expect(findBidders(bidders, '007')).toHaveLength(1);
    expect(findBidders(bidders, '007')[0].displayName).toBe('Agent Bond');
    expect(findBidders(bidders, '7')[0].displayName).toBe('Plain Seven');
  });

  it('is case-insensitive and trims whitespace', () => {
    const bidders = [makeBidder('VIP-12', 'Big Donor')];
    expect(findBidders(bidders, '  vip-12  ')).toHaveLength(1);
  });

  it('returns an empty array when nothing matches', () => {
    const bidders = [makeBidder('101', 'Alex Johnson')];
    expect(findBidders(bidders, '999')).toHaveLength(0);
  });

  it('returns an empty array for a blank query', () => {
    const bidders = [makeBidder('101', 'Alex Johnson')];
    expect(findBidders(bidders, '   ')).toHaveLength(0);
  });

  it('returns every match when duplicates exist, without picking one', () => {
    const bidders = [makeBidder('254', 'First Entry'), makeBidder('254', 'Second Entry')];
    const matches = findBidders(bidders, '254');
    expect(matches).toHaveLength(2);
  });
});

describe('findDuplicateNumbers', () => {
  it('groups bidders that share a normalized number', () => {
    const bidders = [makeBidder('254', 'A'), makeBidder('254', 'B'), makeBidder('101', 'C')];
    const groups = findDuplicateNumbers(bidders);
    expect(groups.size).toBe(1);
    expect(groups.get('254')).toHaveLength(2);
  });

  it('returns an empty map when there are no duplicates', () => {
    const bidders = [makeBidder('254', 'A'), makeBidder('101', 'B')];
    expect(findDuplicateNumbers(bidders).size).toBe(0);
  });
});

describe('sortBidders / searchBiddersByText', () => {
  it('sorts bidders numerically by their normalized number', () => {
    const bidders = [makeBidder('20', 'Twenty'), makeBidder('3', 'Three'), makeBidder('100', 'Hundred')];
    expect(sortBidders(bidders).map((b) => b.number)).toEqual(['3', '20', '100']);
  });

  it('searches by number, name, or company', () => {
    const bidders = [
      makeBidder('154', 'Mountain View Construction'),
      makeBidder('312', 'Billings Community Foundation', 'Billings Co'),
    ];
    expect(searchBiddersByText(bidders, 'mountain')).toHaveLength(1);
    expect(searchBiddersByText(bidders, 'billings co')).toHaveLength(1);
    expect(searchBiddersByText(bidders, '312')).toHaveLength(1);
    expect(searchBiddersByText(bidders, 'nomatch')).toHaveLength(0);
  });
});
