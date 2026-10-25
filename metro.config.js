const { getDefaultConfig } = require('expo/metro-config');

const { headersFor } = require('./scripts/web/headers');

const config = getDefaultConfig(__dirname);

// expo-sqlite on web ships SQLite as WebAssembly.
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// Same headers as production, so the dev server is cross-origin isolated and
// CSP problems show up before deploy. See docs/SECURITY.md.
const enhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, metroServer) => {
  const enhanced = enhanceMiddleware ? enhanceMiddleware(middleware, metroServer) : middleware;
  return (req, res, next) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    for (const [name, value] of Object.entries(headersFor(pathname))) {
      // Metro's hot reload needs a fresh bundle on every request.
      if (name !== 'Cache-Control') res.setHeader(name, value);
    }
    return enhanced(req, res, next);
  };
};

module.exports = config;
