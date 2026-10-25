// eslint-disable-next-line @typescript-eslint/no-require-imports
const { CSP, SECURITY_HEADERS, headersFor, toHeadersFile } = require('../headers');

function directives(csp: string): Map<string, string[]> {
  return new Map(
    csp
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name = '', ...values] = part.split(/\s+/);
        return [name, values] as const;
      }),
  );
}

describe('CSP', () => {
  const csp = directives(CSP);

  it('locks every fetch to our own origin', () => {
    expect(csp.get('default-src')).toEqual(["'self'"]);
    expect(csp.get('connect-src')).toEqual(["'self'"]);
    expect(csp.get('object-src')).toEqual(["'none'"]);
    expect(csp.get('base-uri')).toEqual(["'none'"]);
    expect(csp.get('form-action')).toEqual(["'none'"]);
    expect(csp.get('frame-ancestors')).toEqual(["'none'"]);
  });

  it('allows WASM compilation but never script eval or inline script', () => {
    const scriptSrc = csp.get('script-src') ?? [];
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).toContain("'wasm-unsafe-eval'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it('allows the blob: worker Metro creates for SQLite under cross-origin isolation', () => {
    expect(csp.get('worker-src')).toEqual(["'self'", 'blob:']);
  });

  it('never allows a wildcard or a third-party host', () => {
    for (const values of csp.values()) {
      for (const value of values) {
        expect(value).not.toBe('*');
        expect(value).not.toMatch(/^https?:/);
      }
    }
  });
});

describe('SECURITY_HEADERS', () => {
  it('makes the page cross-origin isolated with values Safari supports', () => {
    expect(SECURITY_HEADERS['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(SECURITY_HEADERS['Cross-Origin-Embedder-Policy']).toBe('require-corp');
  });

  it('includes the hardening headers from docs/SECURITY.md', () => {
    expect(SECURITY_HEADERS['Content-Security-Policy']).toBe(CSP);
    expect(SECURITY_HEADERS['Strict-Transport-Security']).toMatch(/max-age=\d{8,}/);
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
    expect(SECURITY_HEADERS['Referrer-Policy']).toBe('no-referrer');
    expect(SECURITY_HEADERS['Permissions-Policy']).toContain('camera=()');
  });
});

describe('headersFor', () => {
  it('applies the security headers to every path, including wasm and the worker', () => {
    for (const path of ['/', '/index.html', '/sw.js', '/assets/wa-sqlite.wasm', '/_expo/static/js/web/entry-abc.js']) {
      expect(headersFor(path)).toMatchObject(SECURITY_HEADERS);
    }
  });

  it('never lets the browser cache the service worker or the HTML shell', () => {
    expect(headersFor('/sw.js')['Cache-Control']).toBe('no-cache');
    expect(headersFor('/')['Cache-Control']).toBe('no-cache');
    expect(headersFor('/index.html')['Cache-Control']).toBe('no-cache');
  });

  it('caches content-hashed bundles forever', () => {
    expect(headersFor('/_expo/static/js/web/entry-abc123.js')['Cache-Control']).toBe(
      'public, max-age=31536000, immutable',
    );
  });
});

describe('toHeadersFile', () => {
  const file: string = toHeadersFile();

  it('starts with a catch-all rule carrying every security header', () => {
    const lines = file.split('\n');
    expect(lines[0]).toBe('/*');
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(file).toContain(`  ${name}: ${value}`);
    }
  });

  it('marks the service worker no-cache', () => {
    expect(file).toMatch(/^\/sw\.js\n {2}Cache-Control: no-cache$/m);
  });
});
