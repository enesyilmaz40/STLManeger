import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

async function buildElectron() {
  console.log('Building Electron main & preload scripts...');

  if (!fs.existsSync('dist-electron')) {
    fs.mkdirSync('dist-electron', { recursive: true });
  }
  if (!fs.existsSync('dist-electron/workers')) {
    fs.mkdirSync('dist-electron/workers', { recursive: true });
  }
  if (!fs.existsSync('dist-electron/db')) {
    fs.mkdirSync('dist-electron/db', { recursive: true });
  }
  if (!fs.existsSync('dist-electron/services')) {
    fs.mkdirSync('dist-electron/services', { recursive: true });
  }

  // 1. Main process (everything bundled into main.js)
  await esbuild.build({
    entryPoints: ['electron/main.ts'],
    outfile: 'dist-electron/main.js',
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    external: ['electron', 'better-sqlite3', 'chokidar'],
    sourcemap: true,
  });

  // 2. Preload bridge
  await esbuild.build({
    entryPoints: ['electron/preload.ts'],
    outfile: 'dist-electron/preload.js',
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    external: ['electron'],
    sourcemap: true,
  });

  // 3. Database module
  await esbuild.build({
    entryPoints: ['electron/db/index.ts'],
    outfile: 'dist-electron/db/index.js',
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    external: ['better-sqlite3'],
  });

  // 4. Scanner module (externalizing ../db so it shares the db instance)
  await esbuild.build({
    entryPoints: ['electron/services/scanner.ts'],
    outfile: 'dist-electron/services/scanner.js',
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    external: ['better-sqlite3', '../db', './scanner'],
  });

  // 5. Launcher module
  await esbuild.build({
    entryPoints: ['electron/services/launcher.ts'],
    outfile: 'dist-electron/services/launcher.js',
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    external: ['electron', 'better-sqlite3', '../db'],
  });

  // 6. Thumbnail preload
  await esbuild.build({
    entryPoints: ['electron/workers/thumbnail-preload.ts'],
    outfile: 'dist-electron/workers/thumbnail-preload.js',
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    external: ['electron'],
  });

  // 7. Thumbnail worker
  await esbuild.build({
    entryPoints: ['electron/workers/thumbnail-worker.ts'],
    outfile: 'dist-electron/workers/thumbnail-worker.js',
    bundle: true,
    platform: 'browser',
    target: 'chrome114',
    format: 'iife',
  });

  // Copy assets
  fs.copyFileSync(
    'electron/workers/thumbnail-worker.html',
    'dist-electron/workers/thumbnail-worker.html'
  );
  if (fs.existsSync('electron/db/schema.sql')) {
    fs.copyFileSync('electron/db/schema.sql', 'dist-electron/db/schema.sql');
    fs.copyFileSync('electron/db/schema.sql', 'dist-electron/schema.sql');
  }

  console.log('Electron build completed successfully.');
}

buildElectron().catch((err) => {
  console.error('Electron build failed:', err);
  process.exit(1);
});
