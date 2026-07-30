import { useCallback, useMemo, useState } from 'react';
import type { Bidder, ImportColumnMapping } from '../../types';
import {
  detectCompanyColumn,
  detectFirstLastColumns,
  detectNameColumn,
  detectNumberColumn,
  buildBiddersFromRows,
  parseImportFile,
  type ParsedSheet,
} from '../../lib/importParser';
import { Modal } from '../common/Modal';

interface ImportWizardProps {
  existingBidders: Bidder[];
  onClose: () => void;
  onImport: (bidders: Bidder[], mode: 'replace' | 'append') => void;
}

const NONE = '(none)';

export function ImportWizard({ existingBidders, onClose, onImport }: ImportWizardProps) {
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [numberColumn, setNumberColumn] = useState('');
  const [useFirstLast, setUseFirstLast] = useState(false);
  const [nameColumn, setNameColumn] = useState('');
  const [firstColumn, setFirstColumn] = useState('');
  const [lastColumn, setLastColumn] = useState('');
  const [companyColumn, setCompanyColumn] = useState('');
  const [combineMode, setCombineMode] = useState<ImportColumnMapping['nameCombineMode']>('person');
  const [mode, setMode] = useState<'append' | 'replace'>('append');

  const loadFile = useCallback(async (file: File) => {
    setFileError(null);
    try {
      const parsed = await parseImportFile(file);
      if (parsed.columns.length === 0) {
        setFileError('No columns were detected in this file. Check the file and try again.');
        return;
      }
      setSheet(parsed);
      const detectedNumber = detectNumberColumn(parsed.columns);
      const detectedName = detectNameColumn(parsed.columns);
      const { first, last } = detectFirstLastColumns(parsed.columns);
      const detectedCompany = detectCompanyColumn(parsed.columns);

      setNumberColumn(detectedNumber ?? parsed.columns[0]);
      if (!detectedName && (first || last)) {
        setUseFirstLast(true);
        setFirstColumn(first ?? '');
        setLastColumn(last ?? '');
      } else {
        setUseFirstLast(false);
        setNameColumn(detectedName ?? parsed.columns[1] ?? parsed.columns[0]);
      }
      setCompanyColumn(detectedCompany ?? '');
      setCombineMode('person');
    } catch {
      setFileError('Could not read this file. Make sure it is a valid CSV, XLSX, or XLS file.');
    }
  }, []);

  const mapping: ImportColumnMapping = useMemo(
    () => ({
      numberColumn,
      nameColumns: useFirstLast ? [firstColumn, lastColumn].filter(Boolean) : [nameColumn].filter(Boolean),
      companyColumn: companyColumn || undefined,
      nameCombineMode: combineMode,
    }),
    [numberColumn, useFirstLast, firstColumn, lastColumn, nameColumn, companyColumn, combineMode],
  );

  const result = useMemo(() => {
    if (!sheet) return null;
    return buildBiddersFromRows(sheet.rows, mapping, mode === 'replace' ? [] : existingBidders);
  }, [sheet, mapping, existingBidders, mode]);

  return (
    <Modal title="Import Bidder List" onClose={onClose} wide>
      {!sheet && (
        <div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) void loadFile(file);
            }}
            className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center ${
              dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-white/15'
            }`}
          >
            <p className="text-sm text-neutral-300">Drag and drop a CSV or Excel file here</p>
            <p className="text-xs text-neutral-500">or</p>
            <label className="cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
              Choose File
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void loadFile(file);
                }}
              />
            </label>
          </div>
          {fileError && <p className="mt-3 text-sm text-red-400">{fileError}</p>}
        </div>
      )}

      {sheet && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-xs text-neutral-400">
              Bidder Number Column
              <select
                value={numberColumn}
                onChange={(e) => setNumberColumn(e.target.value)}
                className="rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white"
              >
                {sheet.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-neutral-400">
              Company Column
              <select
                value={companyColumn}
                onChange={(e) => setCompanyColumn(e.target.value)}
                className="rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white"
              >
                <option value="">{NONE}</option>
                {sheet.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-2 rounded border border-white/10 p-3">
            <label className="flex items-center gap-2 text-xs text-neutral-300">
              <input type="checkbox" checked={useFirstLast} onChange={(e) => setUseFirstLast(e.target.checked)} />
              Combine separate First Name / Last Name columns
            </label>
            {useFirstLast ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs text-neutral-400">
                  First Name Column
                  <select
                    value={firstColumn}
                    onChange={(e) => setFirstColumn(e.target.value)}
                    className="rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white"
                  >
                    <option value="">{NONE}</option>
                    {sheet.columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-neutral-400">
                  Last Name Column
                  <select
                    value={lastColumn}
                    onChange={(e) => setLastColumn(e.target.value)}
                    className="rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white"
                  >
                    <option value="">{NONE}</option>
                    {sheet.columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <label className="flex flex-col gap-1 text-xs text-neutral-400">
                Name Column
                <select
                  value={nameColumn}
                  onChange={(e) => setNameColumn(e.target.value)}
                  className="rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white"
                >
                  {sheet.columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {companyColumn && (
              <label className="flex flex-col gap-1 text-xs text-neutral-400">
                Display name uses
                <select
                  value={combineMode}
                  onChange={(e) => setCombineMode(e.target.value as ImportColumnMapping['nameCombineMode'])}
                  className="rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white"
                >
                  <option value="person">Person name only</option>
                  <option value="company">Company name only</option>
                  <option value="person-and-company">Person and company</option>
                </select>
              </label>
            )}
          </div>

          {result && (
            <div className="flex flex-col gap-2">
              <div className="rounded border border-white/10 bg-black/30 p-3 text-sm">
                <p className="text-neutral-200">
                  <strong className="text-green-400">{result.importedCount}</strong> of {result.totalRows} rows will
                  be imported.
                </p>
                {result.warnings.length > 0 && (
                  <ul className="mt-2 max-h-32 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs text-amber-300">
                    {result.warnings.slice(0, 25).map((w, i) => (
                      <li key={i}>{w.message}</li>
                    ))}
                    {result.warnings.length > 25 && <li>…and {result.warnings.length - 25} more</li>}
                  </ul>
                )}
              </div>

              {result.bidders.length > 0 && (
                <div className="overflow-x-auto rounded border border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 text-neutral-400">
                      <tr>
                        <th className="px-2 py-1">Number</th>
                        <th className="px-2 py-1">Name</th>
                        <th className="px-2 py-1">Company</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.bidders.slice(0, 5).map((b) => (
                        <tr key={b.id} className="border-t border-white/5 text-neutral-200">
                          <td className="px-2 py-1 font-bold">{b.number}</td>
                          <td className="px-2 py-1">{b.displayName}</td>
                          <td className="px-2 py-1">{b.company}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <fieldset className="flex gap-4 text-xs text-neutral-300">
                <legend className="mb-1 text-neutral-400">Import mode</legend>
                <label className="flex items-center gap-1">
                  <input type="radio" checked={mode === 'append'} onChange={() => setMode('append')} />
                  Add to existing list
                </label>
                <label className="flex items-center gap-1">
                  <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} />
                  Replace entire list
                </label>
              </fieldset>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSheet(null)}
                  className="rounded px-3 py-1.5 text-sm text-neutral-400 hover:bg-white/5"
                >
                  Choose a different file
                </button>
                <button
                  type="button"
                  disabled={result.importedCount === 0}
                  onClick={() => {
                    onImport(result.bidders, mode);
                    onClose();
                  }}
                  className="rounded bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-900 disabled:text-blue-300/50"
                >
                  Import {result.importedCount} Bidders
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
