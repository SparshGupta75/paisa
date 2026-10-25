import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

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

  // The Cache API matches URLs exactly. If we encode a character the browser
  // leaves alone (like @ in node_modules/@expo), the cached copy never matches.
  it('encodes paths exactly as the browser does, so cache keys match requests', () => {
    const names = [
      'assets/node_modules/@expo/vector-icons/Ionicons.abc.ttf',
      'assets/clear-icon@2x.png',
      'assets/a b#c.png',
      'assets/100%.png',
      'assets/q?.js',
      'assets/ü.png',
      "assets/it's(1)~!*.png",
      'assets/[id]-chunk|v^2.js',
    ];
    const files: string[] = listPrecacheFiles(makeDist(Object.fromEntries(names.map((n) => [n, 'x']))));
    expect(files).toContain('/assets/node_modules/@expo/vector-icons/Ionicons.abc.ttf');
    expect(files).toContain('/assets/clear-icon@2x.png');
    // Browsers send [ ] | ^ raw in paths.
    expect(files).toContain('/assets/[id]-chunk|v^2.js');
    for (const url of files) {
      expect(new URL(url, 'https://paisa.test').pathname).toBe(url);
    }
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

  it('reads back files whose names needed encoding', () => {
    const dist = makeDist({ 'assets/a b#c.png': 'x', 'assets/100%.png': 'y', 'assets/@x/y@2x.png': 'z' });
    expect(() => computeVersion(dist, listPrecacheFiles(dist))).not.toThrow();
  });

  it('changes when a file is renamed but its content is not', () => {
    const a = makeDist({ 'index.html': 'same', 'a.js': 'same' });
    const b = makeDist({ 'index.html': 'same', 'b.js': 'same' });
    expect(computeVersion(a, listPrecacheFiles(a))).not.toBe(computeVersion(b, listPrecacheFiles(b)));
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
    // Browsers treat \ as / and drop tabs, so both of these resolve to evil.test.
    expect(() => buildServiceWorker({ version: 'abc123def456', files: ['/\\evil.test/x.js'] })).toThrow();
    expect(() => buildServiceWorker({ version: 'abc123def456', files: ['/\t/evil.test/x.js'] })).toThrow();
  });

  it('rejects a version that only looks like hex after toString()', () => {
    expect(() => buildServiceWorker({ version: ['abc123def456'], files: [] })).toThrow();
  });

  it('embeds entries literally, without expanding $ replacement patterns', () => {
    const worker: string = buildServiceWorker({ version: 'abc123def456', files: ["/$&", "/$'", '/$`'] });
    expect(() => new vm.Script(worker)).not.toThrow();
    expect(worker).toContain('const PRECACHE = ["/$&","/$\'","/$`"];');
  });
});
