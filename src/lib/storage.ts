const PREFIX = 'bidboard:';

export const STORAGE_KEYS = {
  events: `${PREFIX}events`,
  activeEventId: `${PREFIX}activeEventId`,
  hasLaunched: `${PREFIX}hasLaunched`,
} as const;

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`BidBoard: failed to read "${key}" from storage`, err);
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`BidBoard: failed to write "${key}" to storage`, err);
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.error(`BidBoard: failed to remove "${key}" from storage`, err);
  }
}
