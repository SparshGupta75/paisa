/**
 * Response headers for the web build. One source of truth for the dev server
 * (metro.config.js), the local E2E server (scripts/serve-web.js), and the host
 * (`_headers`, written by scripts/build-web.js). See docs/SECURITY.md#required-response-headers.
 *
 * CommonJS because metro.config.js and the build scripts load it directly.
 */

const CSP = [
  "default-src 'self'",
  // WASM compilation for SQLite; never 'unsafe-eval' or inline script.
  "script-src 'self' 'wasm-unsafe-eval'",
  // Metro wraps the SQLite worker in a blob: URL when the page is cross-origin isolated.
  "worker-src 'self' blob:",
  // react-native-web and Expo's reset emit inline styles.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': CSP,
  'Cross-Origin-Opener-Policy': 'same-origin',
  // Not `credentialless`: Safari is not known to support it. We load nothing
  // cross-origin, so `require-corp` costs nothing.
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
});

const NO_CACHE = 'no-cache';
const IMMUTABLE = 'public, max-age=31536000, immutable';

function cacheControlFor(pathname) {
  if (pathname.startsWith('/_expo/static/')) return IMMUTABLE;
  // The worker, the HTML shell, and everything else revalidate. The service
  // worker owns offline caching; the HTTP cache must never pin an old worker.
  return NO_CACHE;
}

function headersFor(pathname) {
  return { ...SECURITY_HEADERS, 'Cache-Control': cacheControlFor(pathname) };
}

/** Netlify / Cloudflare Pages `_headers` format. */
function toHeadersFile() {
  const block = (pattern, headers) =>
    [pattern, ...Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`)].join('\n');

  return (
    [
      block('/*', { ...SECURITY_HEADERS, 'Cache-Control': NO_CACHE }),
      block('/sw.js', { 'Cache-Control': NO_CACHE }),
      block('/_expo/static/*', { 'Cache-Control': IMMUTABLE }),
    ].join('\n') + '\n'
  );
}

module.exports = { CSP, SECURITY_HEADERS, headersFor, toHeadersFile };
