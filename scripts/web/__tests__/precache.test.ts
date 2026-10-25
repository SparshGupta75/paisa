import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildServiceWorker, computeVersion, listPrecacheFiles } = require('../precache');

function makeDist(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paisa-dist-'));
  for (const [rel, contents] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents);
  }
  return dir;
}

const BASE = {
  'index.html': '<html></html>',
  '_expo/static/js/web/entry-abc.js': 'console.info(1)',
  '_expo/static/js/web/entry-abc.js.map': '{}',
  'assets/node_modules/expo-sqlite/web/wa-sqlite/wa-sqlite.123.wasm': 'wasm',
  'manifest.webmanifest': '{}',
  'icons/icon-192.png': 'png',
  'sw.js': 'old worker',
  '_headers': '/*',
  '.DS_Store': 'junk',
  'metadata.json': '{}',
};

describe('listPrecacheFiles', () => {
  it('lists the app shell as absolute, sorted URL paths', () => {
    const files: string[] = listPrecacheFiles(makeDist(BASE));
    expect(files).toEqual([...files].sort());
    expect(files).toContain('/index.html');
    expect(files).toContain('/_expo/static/js/web/entry-abc.js');
    expect(files).toContain('/assets/node_modules/expo-sqlite/web/wa-sqlite/wa-sqlite.123.wasm');
    expect(files).toContain('/manifest.webmanifest');
    expect(files).toContain('/icons/icon-192.png');
  });

  it('excludes the worker itself, host config, source maps, and junk', () => {
    const files: string[] = listPrecacheFiles(makeDist(BASE));
    expect(files).not.toContain('/sw.js');
    expect(files).not.toContain('/_headers');
    expect(files).not.toContain('/.DS_Store');
    expect(files).not.toContain('/metadata.json');
    expect(files.some((file) => file.endsWith('.map'))).toBe(false);
  });

  it('uses forward slashes and URL-encodes unsafe characters', () => {
    const files: string[] = listPrecacheFiles(makeDist({ 'assets/a b#c.png': 'x' }));
    expect(files).toEqual(['/assets/a%20b%23c.png']);
  });
});

describe('computeVersion', () => {
  it('is stable for identical content and changes when any file changes', () => {
    const a = makeDist(BASE);
    const b = makeDist(BASE);
    const c = makeDist({ ...BASE, 'index.html': '<html>v2</html>' });
    const files: string[] = listPrecacheFiles(a);
    expect(computeVersion(a, files)).toBe(computeVersion(b, files));
    expect(computeVersion(a, files)).not.toBe(computeVersion(c, files));
    expect(computeVersion(a, files)).toMatch(/^[0-9a-f]{12}$/);
  });
});

describe('buildServiceWorker', () => {
  const source: string = buildServiceWorker({
    version: 'abc123def456',
    files: ['/index.html', '/_expo/static/js/web/entry-abc.js'],
  });

  it('embeds the version and precache list as data, not code', () => {
    expect(source).toContain('const VERSION = "abc123def456";');
    expect(source).toContain('const PRECACHE = ["/index.html","/_expo/static/js/web/entry-abc.js"];');
    expect(source).not.toContain('__PAISA_');
  });

  it('rejects a version that is not a short hex hash', () => {
    expect(() => buildServiceWorker({ version: '"; alert(1); "', files: [] })).toThrow();
  });

  it('rejects precache entries that are not same-origin absolute paths', () => {
    expect(() => buildServiceWorker({ version: 'abc123def456', files: ['https://evil.test/x.js'] })).toThrow();
    expect(() => buildServiceWorker({ version: 'abc123def456', files: ['//evil.test/x.js'] })).toThrow();
  });
});
