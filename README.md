# Paisa

A private, offline expense tracker that installs on your iPhone Home Screen. Your data stays in your browser on that device.

```bash
npm install
npm run dev        # develop
npm test           # unit tests (Vitest)
npm run build      # production build + offline service worker
npm run e2e        # Playwright smoke tests (iPhone 15, WebKit)
```

Stack: React + Vite + TypeScript, Tailwind, Dexie (IndexedDB), vite-plugin-pwa.
Money is stored as integer paise and dates as local `YYYY-MM-DD`.
