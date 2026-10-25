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

const { SECURITY_HEADERS, headersFor } = require('./web/headers');

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

/** The real file under `root` for a request path, or null. Never escapes root. */
function resolveFile(root, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;

  const inRoot = (candidate) => candidate === root || candidate.startsWith(root + path.sep);
  const existingFile = (candidate) => {
    try {
      // realpath, so a symlink inside root cannot point outside it.
      const real = fs.realpathSync(candidate);
      return inRoot(real) && fs.statSync(real).isFile() ? real : null;
    } catch {
      return null;
    }
  };

  const candidate = path.resolve(root, `.${decoded === '/' ? '/index.html' : decoded}`);
  if (!inRoot(candidate)) return null;
  const file = existingFile(candidate);
  if (file) return file;
  // App routes and directories (no file extension) get the SPA shell.
  return path.extname(decoded) ? null : existingFile(path.join(root, 'index.html'));
}

function createServer({ root }) {
  const realRoot = fs.realpathSync(path.resolve(root));

  const send = (res, status, body) => {
    res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(body);
  };

  const server = http.createServer((req, res) => {
    let pathname;
    try {
      ({ pathname } = new URL(req.url ?? '/', 'http://localhost'));
    } catch {
      send(res, 400, 'Bad request');
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, 'Method not allowed');
      return;
    }

    const file = resolveFile(realRoot, pathname);
    if (!file) {
      send(res, 404, 'Not found');
      return;
    }

    // Headers follow the file actually served, not the path used to reach it.
    const servedPath = `/${path.relative(realRoot, file).split(path.sep).join('/')}`;
    res.writeHead(200, {
      ...headersFor(servedPath),
      'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(file)
      .on('error', () => res.destroy())
      .pipe(res);
  });

  // Requests the HTTP parser itself rejects.
  server.on('clientError', (_error, socket) => {
    if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
  });

  return server;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const option = (name, fallback) => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
  };
  const port = Number(option('port', '4173'));
  const root = path.resolve(option('dir', 'dist'));

  createServer({ root }).listen(port, '127.0.0.1', () => {
    console.info(`Serving ${root} at http://localhost:${port}`);
  });
}

module.exports = { createServer };
