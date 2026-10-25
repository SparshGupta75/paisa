/**
 * Generates the service worker from scripts/web/sw.template.js with the list of
 * files to precache and a content-derived version. Run by scripts/build-web.js
 * after `expo export`.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const TEMPLATE_PATH = path.join(__dirname, 'sw.template.js');

// Files the host or the worker itself handle; caching them would be wrong.
const EXCLUDED = new Set(['/sw.js', '/_headers', '/_redirects', '/metadata.json']);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function toUrlPath(distDir, file) {
  const segments = path.relative(distDir, file).split(path.sep).map(encodeURIComponent);
  return `/${segments.join('/')}`;
}

function listPrecacheFiles(distDir) {
  return walk(distDir)
    .map((file) => toUrlPath(distDir, file))
    .filter((url) => !EXCLUDED.has(url))
    .filter((url) => !url.endsWith('.map'))
    .filter((url) => !url.split('/').pop().startsWith('.'))
    .sort();
}

function computeVersion(distDir, files) {
  const hash = crypto.createHash('sha256');
  for (const url of files) {
    const rel = url.slice(1).split('/').map(decodeURIComponent).join(path.sep);
    hash.update(url);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(distDir, rel)));
    hash.update('\0');
  }
  return hash.digest('hex').slice(0, 12);
}

function buildServiceWorker({ version, files }) {
  if (!/^[0-9a-f]{12}$/.test(version)) {
    throw new Error('Service worker version must be a 12-character hex hash.');
  }
  for (const file of files) {
    if (typeof file !== 'string' || !file.startsWith('/') || file.startsWith('//')) {
      throw new Error('Precache entries must be same-origin absolute paths.');
    }
  }

  return fs
    .readFileSync(TEMPLATE_PATH, 'utf8')
    .replace('"__PAISA_VERSION__"', JSON.stringify(version))
    .replace('["__PAISA_PRECACHE__"]', JSON.stringify(files));
}

module.exports = { buildServiceWorker, computeVersion, listPrecacheFiles };
