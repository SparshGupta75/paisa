#!/usr/bin/env node
/**
 * Minimal static server for the exported web build, used by Playwright and for
 * local checks. Applies the production headers from scripts/web/headers.js and
 * falls back to index.html for app routes. Binds to 127.0.0.1 only.
 * Usage: node scripts/serve-web.js [--port 4173] [--dir dist]
 */
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const { headersFor } = require('./web/headers');

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const port = Number(option('port', '4173'));
const root = path.resolve(option('dir', 'dist'));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
};

function resolveFile(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const candidate = path.resolve(root, `.${decoded}`);
  // Refuse anything that escapes the build directory.
  if (candidate !== root && !candidate.startsWith(root + path.sep)) return null;
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  // App routes (no extension) get the SPA shell.
  if (!path.extname(decoded)) return path.join(root, 'index.html');
  return null;
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  const file = resolveFile(pathname === '/' ? '/index.html' : pathname);
  const headers = headersFor(pathname);

  if (!file || (req.method !== 'GET' && req.method !== 'HEAD')) {
    res.writeHead(file ? 405 : 404, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(file ? 'Method not allowed' : 'Not found');
    return;
  }

  res.writeHead(200, {
    ...headers,
    'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  fs.createReadStream(file).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.info(`Serving ${root} at http://localhost:${port}`);
});
