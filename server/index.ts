import { fileURLToPath } from 'node:url';
import path from 'node:path';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../src/shared/socketTypes';
import { attachSocketServer } from './socketServer';
import { getLocalIPv4Addresses } from './network';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const DIST_DIR = path.resolve(__dirname, '..', 'dist');

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
});

attachSocketServer(io, { port: PORT });

app.use(express.static(DIST_DIR));

// SPA fallback: any non-file GET (e.g. /remote) serves the built app, which
// picks the right view (operator, audience, or remote) from the URL client-side.
app.get('/*splat', (_req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

httpServer.listen(PORT, () => {
  const ips = getLocalIPv4Addresses();
  console.log(`BidBoard server listening on port ${PORT}`);
  console.log(`  Operator:  http://localhost:${PORT}/`);
  for (const ip of ips) {
    console.log(`  Remote:    http://${ip}:${PORT}/remote`);
  }
  if (ips.length === 0) {
    console.log('  Could not auto-detect a LAN IP address — see README for manual instructions.');
  }
});
