import { networkInterfaces } from 'node:os';

/** Returns likely LAN-reachable IPv4 addresses for this machine, best guess
 * first. Excludes loopback and virtual/internal-looking interfaces where
 * possible, but errs on the side of listing more rather than hiding a valid
 * address — the operator can see all candidates if auto-detection guesses
 * wrong. */
export function getLocalIPv4Addresses(): string[] {
  const interfaces = networkInterfaces();
  const candidates: string[] = [];

  for (const [name, addresses] of Object.entries(interfaces)) {
    if (!addresses) continue;
    const lowerName = name.toLowerCase();
    const looksVirtual = /(virtual|vmware|vbox|docker|veth|loopback)/.test(lowerName);
    for (const addr of addresses) {
      if (addr.family !== 'IPv4' || addr.internal) continue;
      if (looksVirtual) {
        candidates.push(addr.address);
      } else {
        candidates.unshift(addr.address);
      }
    }
  }

  return candidates;
}
