/** Socket.IO address for this page.
 * A page already opened from the BidBoard server talks to that same server.
 * A page opened from a separate dev preview still reaches the server port. */
export function getSocketUrl(): string {
  const configuredPort = (import.meta.env.VITE_SOCKET_PORT as string | undefined) ?? '3001';
  if (window.location.port === configuredPort) return window.location.origin;
  return `${window.location.protocol}//${window.location.hostname}:${configuredPort}`;
}
