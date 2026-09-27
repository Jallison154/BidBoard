export type CompanionLayout = 'phone' | 'ipad';

const LAYOUT_KEY = 'bidboard-companion-layout';

/** Tablets keep a short side of at least 600px. Phones stay under that, including in landscape. */
export function detectCompanionLayout(): CompanionLayout {
  const shortSide = Math.min(window.screen.width, window.screen.height);
  return shortSide >= 600 ? 'ipad' : 'phone';
}

/**
 * A scanned QR code has no layout of its own, so the device screen size
 * decides, unless this browser already switched layouts by hand. `?view=ipad`
 * and `?view=remote` still force a layout.
 */
export function resolveCompanionLayout(search: string): CompanionLayout {
  const params = new URLSearchParams(search);
  const explicit = params.get('layout');
  if (explicit === 'phone' || explicit === 'ipad') return explicit;
  const view = params.get('view');
  if (view === 'ipad') return 'ipad';
  if (view === 'remote') return 'phone';
  try {
    const stored = localStorage.getItem(LAYOUT_KEY);
    if (stored === 'phone' || stored === 'ipad') return stored;
  } catch {
    // private mode can block storage; fall through to the screen size
  }
  return detectCompanionLayout();
}

export function storeCompanionLayout(layout: CompanionLayout): void {
  try {
    localStorage.setItem(LAYOUT_KEY, layout);
  } catch {
    // the choice still applies for this visit
  }
}
