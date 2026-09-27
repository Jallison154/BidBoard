import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseDir = path.join(root, 'release');
const cacheDir = path.join(releaseDir, 'cache');
const bundlePath = path.join(cacheDir, 'server.mjs');
const blobPath = path.join(cacheDir, 'sea-prep.blob');
const configPath = path.join(cacheDir, 'sea-config.json');
const nodeExe = path.join(cacheDir, 'node.exe');
const outputExe = path.join(releaseDir, 'BidBoard.exe');

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

fs.mkdirSync(cacheDir, { recursive: true });

console.log('Building the operator and phone pages...');
run('npm', ['run', 'build']);

console.log('Bundling the server...');
run('npx', [
  'esbuild',
  'server/index.ts',
  '--bundle',
  '--platform=node',
  `--target=node${process.versions.node.split('.')[0]}`,
  '--format=esm',
  `--outfile=${bundlePath}`,
  '--external:vite',
]);

const distDir = path.join(root, 'dist');
const assets = { 'bidboard-manifest.json': path.join(cacheDir, 'bidboard-manifest.json') };
const manifest = [];
for (const file of walk(distDir)) {
  const rel = path.relative(distDir, file).split(path.sep).join('/');
  manifest.push(rel);
  assets[rel] = file;
}
fs.writeFileSync(assets['bidboard-manifest.json'], JSON.stringify(manifest));

fs.writeFileSync(
  configPath,
  JSON.stringify(
    {
      main: bundlePath,
      output: blobPath,
      disableExperimentalSEAWarning: true,
      useSnapshot: false,
      useCodeCache: false,
      assets,
    },
    null,
    2,
  ),
);

console.log('Packing the app into one blob...');
run(process.execPath, ['--experimental-sea-config', configPath]);

const version = process.version;
if (!fs.existsSync(nodeExe)) {
  const url = `https://nodejs.org/dist/${version}/win-x64/node.exe`;
  console.log(`Downloading the Windows runtime ${version}...`);
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Could not download ${url} (${response.status}).`);
    process.exit(1);
  }
  fs.writeFileSync(nodeExe, Buffer.from(await response.arrayBuffer()));
}

fs.copyFileSync(nodeExe, outputExe);
console.log('Injecting BidBoard into BidBoard.exe...');
run('npx', [
  '--yes',
  'postject',
  outputExe,
  'NODE_SEA_BLOB',
  blobPath,
  '--sentinel-fuse',
  'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
]);

const sizeMb = (fs.statSync(outputExe).size / (1024 * 1024)).toFixed(1);
console.log(`Wrote ${outputExe} (${sizeMb} MB)`);
