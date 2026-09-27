import type { BidBoardEvent, BidBoardEventFile } from '../types';

export function eventFileName(name: string): string {
  const safe = name.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'event';
  return `${safe}.bidboard.json`;
}

function eventFileBody(event: BidBoardEvent): string {
  const file: BidBoardEventFile = { fileFormat: 'bidboard-event', formatVersion: 1, event };
  return JSON.stringify(file, null, 2);
}

interface SaveFilePicker {
  (options: {
    suggestedName?: string;
    types?: Array<{ description?: string; accept: Record<string, string[]> }>;
  }): Promise<{
    createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }>;
  }>;
}

/** Saves the event as a .bidboard.json file. Uses a Save dialog when the
 * browser allows it, so the file can be put on a USB drive or another folder.
 * Returns false when the person cancels the dialog. */
export async function saveEventFile(event: BidBoardEvent): Promise<boolean> {
  const json = eventFileBody(event);
  const filename = eventFileName(event.name);
  const picker = (window as Window & { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({
        suggestedName: filename,
        types: [
          {
            description: 'BidBoard event',
            accept: { 'application/json': ['.bidboard.json', '.json'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return false;
    }
  }

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
