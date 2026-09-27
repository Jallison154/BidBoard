import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../src/shared/socketTypes';
import { attachSocketServer } from './socketServer';
import { getLocalIPv4Addresses } from './network';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;

/** The Windows .exe carries the built pages inside it and unpacks them here on launch. */
function distDirFromExe(): string | null {
  try {
    const sea = createRequire(import.meta.url)('node:sea') as {
      isSea: () => boolean;
      getAsset: (key: string, encoding?: string) => string | ArrayBuffer;
    };
    if (!sea.isSea()) return null;
    process.env.BIDBOARD_OPEN ||= '1';
    const manifest = JSON.parse(String(sea.getAsset('bidboard-manifest.json', 'utf8'))) as string[];
    const dir = path.join(os.tmpdir(), 'bidboard-app');
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    for (const rel of manifest) {
      const dest = path.join(dir, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const asset = sea.getAsset(rel);
      fs.writeFileSync(dest, Buffer.from(asset as ArrayBuffer));
    }
    return dir;
  } catch {
    return null;
  }
}

const DIST_DIR = distDirFromExe() ?? path.resolve(__dirname, '..', 'dist');
const isDev = process.argv.includes('--dev');

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
});

attachSocketServer(io, { port: PORT });

async function attachFrontend() {
  if (!isDev) {
    app.use(express.static(DIST_DIR));
    // SPA fallback: any non-file GET (e.g. /remote) serves the built app, which
    // picks the right view (operator, audience, or remote) from the URL client-side.
    app.get('/*splat', (_req, res) => {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
    return;
  }

  // Development serves the live app from this same process, so the operator
  // page and a phone on the network are running one copy of BidBoard.
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: {
      middlewareMode: { server: httpServer },
      allowedHosts: true,
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

function openOperatorBrowser(url: string) {
  if (process.env.BIDBOARD_OPEN !== '1') return;
  const child =
    process.platform === 'win32'
      ? spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true })
      : process.platform === 'darwin'
        ? spawn('open', [url], { detached: true, stdio: 'ignore' })
        : spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
  child.on('error', () => {
    console.log(`  Open this address in a browser: ${url}`);
  });
  child.unref();
}

function httpUrl(host: string, port: number, path = '/'): string {
  const portSuffix = port === 80 ? '' : `:${port}`;
  return `http://${host}${portSuffix}${path}`;
}

await attachFrontend();

httpServer.listen(PORT, () => {
  const ips = getLocalIPv4Addresses();
  const operatorUrl = httpUrl('localhost', PORT);
  console.log('');
  console.log('BidBoard is running.');
  console.log(`  Port: ${PORT}`);
  if (ips.length === 0) {
    console.log('  IP address: not detected. Check this computer\'s network settings.');
  } else {
    for (const ip of ips) {
      console.log(`  IP address: ${ip}`);
      console.log(`  Remote: ${httpUrl(ip, PORT, '/remote')}`);
    }
  }
  console.log(`  On this computer: ${operatorUrl}`);
  console.log('');
  console.log('  The operator and phones use this same server.');
  console.log('  Phones and iPads need the IP address and the port. The :' + PORT + ' at the end cannot be left off.');
  console.log('');
  openOperatorBrowser(operatorUrl);
});
