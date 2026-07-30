import { describe, expect, it } from 'vitest';
import {
  buildBiddersFromRows,
  detectCompanyColumn,
  detectFirstLastColumns,
  detectNameColumn,
  detectNumberColumn,
  parseCSVFile,
} from '../importParser';
import type { ImportColumnMapping } from '../../types';

describe('column auto-detection', () => {
  it('recognizes common bidder-number header aliases', () => {
    expect(detectNumberColumn(['Paddle Number', 'Name'])).toBe('Paddle Number');
    expect(detectNumberColumn(['Bid Number', 'Name'])).toBe('Bid Number');
    expect(detectNumberColumn(['Card', 'Name'])).toBe('Card');
    expect(detectNumberColumn(['Something Else'])).toBeUndefined();
  });

  it('recognizes common name header aliases', () => {
    expect(detectNameColumn(['Guest Name'])).toBe('Guest Name');
    expect(detectNameColumn(['Display Name'])).toBe('Display Name');
  });

  it('recognizes separate first/last name columns', () => {
    expect(detectFirstLastColumns(['First Name', 'Last Name'])).toEqual({ first: 'First Name', last: 'Last Name' });
  });

  it('recognizes company/organization aliases', () => {
    expect(detectCompanyColumn(['Organization'])).toBe('Organization');
    expect(detectCompanyColumn(['Company'])).toBe('Company');
  });
});

describe('buildBiddersFromRows', () => {
  const mapping: ImportColumnMapping = {
    numberColumn: 'Bidder Number',
    nameColumns: ['Display Name'],
    nameCombineMode: 'person',
  };

  it('imports valid rows and preserves leading zeros', () => {
    const rows = [{ 'Bidder Number': '007', 'Display Name': 'Agent Bond' }];
    const result = buildBiddersFromRows(rows, mapping, []);
    expect(result.importedCount).toBe(1);
    expect(result.bidders[0].number).toBe('007');
  });

  it('reports rows missing a bidder number and skips them', () => {
    const rows = [{ 'Bidder Number': '', 'Display Name': 'No Number' }, { 'Bidder Number': '101', 'Display Name': 'Ok' }];
    const result = buildBiddersFromRows(rows, mapping, []);
    expect(result.importedCount).toBe(1);
    expect(result.warnings.some((w) => w.type === 'missing-number')).toBe(true);
  });

  it('reports rows missing a bidder name but still imports them', () => {
    const rows = [{ 'Bidder Number': '203', 'Display Name': '' }];
    const result = buildBiddersFromRows(rows, mapping, []);
    expect(result.importedCount).toBe(1);
    expect(result.warnings.some((w) => w.type === 'missing-name')).toBe(true);
  });

  it('ignores fully empty rows without warnings', () => {
    const rows = [{ 'Bidder Number': '', 'Display Name': '' }];
    const result = buildBiddersFromRows(rows, mapping, []);
    expect(result.importedCount).toBe(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('detects duplicate bidder numbers against existing and new bidders', () => {
    const rows = [{ 'Bidder Number': '254', 'Display Name': 'New Person' }];
    const existing = [
      { id: '1', number: '254', displayName: 'Existing Person', createdAt: 0, updatedAt: 0 },
    ];
    const result = buildBiddersFromRows(rows, mapping, existing);
    expect(result.duplicateNumbers.size).toBe(1);
    expect(result.warnings.some((w) => w.type === 'duplicate-number')).toBe(true);
  });

  it('trims extra whitespace from numbers and names', () => {
    const rows = [{ 'Bidder Number': '  101  ', 'Display Name': '  Alex Johnson  ' }];
    const result = buildBiddersFromRows(rows, mapping, []);
    expect(result.bidders[0].number).toBe('101');
    expect(result.bidders[0].displayName).toBe('Alex Johnson');
  });

  it('combines first and last name columns when configured', () => {
    const combineMapping: ImportColumnMapping = {
      numberColumn: 'Bidder Number',
      nameColumns: ['First Name', 'Last Name'],
      nameCombineMode: 'person',
    };
    const rows = [{ 'Bidder Number': '1', 'First Name': 'Jane', 'Last Name': 'Doe' }];
    const result = buildBiddersFromRows(rows, combineMapping, []);
    expect(result.bidders[0].displayName).toBe('Jane Doe');
  });

  it('combines person and company name when configured', () => {
    const combineMapping: ImportColumnMapping = {
      numberColumn: 'Bidder Number',
      nameColumns: ['Display Name'],
      companyColumn: 'Company',
      nameCombineMode: 'person-and-company',
    };
    const rows = [{ 'Bidder Number': '1', 'Display Name': 'Jane Doe', Company: 'Acme Inc' }];
    const result = buildBiddersFromRows(rows, combineMapping, []);
    expect(result.bidders[0].displayName).toBe('Jane Doe (Acme Inc)');
    expect(result.bidders[0].company).toBe('Acme Inc');
  });
});

describe('parseCSVFile', () => {
  it('parses a CSV file into columns and rows', async () => {
    const csv = 'Bidder Number,Display Name\n101,Alex Johnson\n254,John & Sarah Smith\n';
    const file = new File([csv], 'bidders.csv', { type: 'text/csv' });
    const parsed = await parseCSVFile(file);
    expect(parsed.columns).toEqual(['Bidder Number', 'Display Name']);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[1]['Display Name']).toBe('John & Sarah Smith');
  });
});
