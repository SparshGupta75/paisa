#!/usr/bin/env node
/**
 * Post-export step for the web build: writes dist/sw.js and dist/_headers.
 * Usage: node scripts/build-web.js [distDir]   (default: dist)
 */
const fs = require('node:fs');
const path = require('node:path');

const { toHeadersFile } = require('./web/headers');
const { buildServiceWorker, computeVersion, listPrecacheFiles } = require('./web/precache');

const distDir = path.resolve(process.argv[2] ?? 'dist');
if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error(`No index.html in ${distDir}. Run \`expo export --platform web\` first.`);
  process.exit(1);
}

const files = listPrecacheFiles(distDir);
const version = computeVersion(distDir, files);
fs.writeFileSync(path.join(distDir, 'sw.js'), buildServiceWorker({ version, files }));
fs.writeFileSync(path.join(distDir, '_headers'), toHeadersFile());

console.info(`Service worker ${version}: ${files.length} files precached.`);
