import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { Bidder, ImportColumnMapping, ImportResult, ImportRow, ImportWarning } from '../types';
import { isBlank, sanitizeText } from './normalize';
import { findDuplicateNumbers } from './bidders';
import { makeBidder } from './events';

export interface ParsedSheet {
  columns: string[];
  rows: ImportRow[];
}

const NUMBER_COLUMN_ALIASES = [
  'bidder number',
  'bid number',
  'bidder',
  'paddle number',
  'paddle',
  'card number',
  'card',
  'number',
  '#',
];

const NAME_COLUMN_ALIASES = ['guest name', 'bidder name', 'display name', 'name'];
const FIRST_NAME_ALIASES = ['first name', 'firstname', 'first'];
const LAST_NAME_ALIASES = ['last name', 'lastname', 'last'];
const COMPANY_ALIASES = ['company', 'organization', 'organisation'];

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function findColumn(columns: string[], aliases: string[]): string | undefined {
  const normalized = columns.map((c) => ({ original: c, norm: normalizeHeader(c) }));
  for (const alias of aliases) {
    const match = normalized.find((c) => c.norm === alias);
    if (match) return match.original;
  }
  return undefined;
}

export function detectNumberColumn(columns: string[]): string | undefined {
  return findColumn(columns, NUMBER_COLUMN_ALIASES);
}

export function detectNameColumn(columns: string[]): string | undefined {
  return findColumn(columns, NAME_COLUMN_ALIASES);
}

export function detectFirstLastColumns(columns: string[]): { first?: string; last?: string } {
  return {
    first: findColumn(columns, FIRST_NAME_ALIASES),
    last: findColumn(columns, LAST_NAME_ALIASES),
  };
}

export function detectCompanyColumn(columns: string[]): string | undefined {
  return findColumn(columns, COMPANY_ALIASES);
}

export function parseCSVFile(file: File): Promise<ParsedSheet> {
  return new Promise((resolve, reject) => {
    Papa.parse<ImportRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const columns = results.meta.fields ?? [];
        resolve({ columns, rows: results.data });
      },
      error: (err: Error) => reject(err),
    });
  });
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedSheet> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { columns: [], rows: [] };
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: '', raw: false });
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { columns, rows };
}

export function parseImportFile(file: File): Promise<ParsedSheet> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || file.type === 'text/csv') {
    return parseCSVFile(file);
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseSpreadsheetFile(file);
  }
  return parseCSVFile(file);
}

function cellValue(row: ImportRow, column: string | undefined): string {
  if (!column) return '';
  const raw = row[column];
  return raw == null ? '' : sanitizeText(String(raw));
}

export function buildBiddersFromRows(
  rows: ImportRow[],
  mapping: ImportColumnMapping,
  existingBidders: Bidder[],
): ImportResult {
  const warnings: ImportWarning[] = [];
  const newBidders: Bidder[] = [];

  rows.forEach((row, index) => {
    const number = cellValue(row, mapping.numberColumn);
    const nameParts = mapping.nameColumns.map((col) => cellValue(row, col)).filter(Boolean);
    const person = nameParts.join(' ');
    const company = cellValue(row, mapping.companyColumn);

    const rowIsEmpty = isBlank(number) && isBlank(person) && isBlank(company);
    if (rowIsEmpty) return;

    if (isBlank(number)) {
      warnings.push({
        type: 'missing-number',
        message: `Row ${index + 2}: missing a bidder number, row skipped.`,
        rowIndex: index,
      });
      return;
    }

    let displayName: string;
    switch (mapping.nameCombineMode) {
      case 'company':
        displayName = company;
        break;
      case 'person-and-company':
        displayName = company ? `${person} (${company})`.trim() : person;
        break;
      default:
        displayName = person;
    }

    if (isBlank(displayName)) {
      warnings.push({
        type: 'missing-name',
        message: `Row ${index + 2} (#${number}): missing a bidder name.`,
        rowIndex: index,
      });
    }

    newBidders.push(makeBidder(number, displayName, company || undefined));
  });

  const duplicateNumbers = findDuplicateNumbers([...existingBidders, ...newBidders]);
  for (const [key, group] of duplicateNumbers) {
    warnings.push({
      type: 'duplicate-number',
      message: `Bidder number "${key}" appears ${group.length} times.`,
    });
  }

  return {
    bidders: newBidders,
    warnings,
    duplicateNumbers,
    totalRows: rows.length,
    importedCount: newBidders.length,
  };
}
