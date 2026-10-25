# Paisa

A private, offline-first expense tracker for iPhone. Rupees in, rupees out — no
account, no cloud, no ads. It installs from Safari to the home screen as a web
app (PWA), and everything lives in SQLite on the device.

> **Status: early.** The foundation and the installable PWA shell are done; the
> ledger is next. See [docs/ROADMAP.md](docs/ROADMAP.md), and
> [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#platform-decision) for why it is a
> web app rather than a native one.

## Run it

Development, on the Mac:

```bash
npm install
npx expo start --web
```

Open the printed URL in Safari (or the iOS Simulator's Safari). Not in a Private
window: Safari Private Browsing cannot open the database.

Production build, checked locally:

```bash
npm run build:web
npm run serve:web
```

Then open `http://localhost:4173`.

On the iPhone: deploy `dist/` to a static host that honours `_headers`
(Cloudflare Pages or Netlify), open the URL in Safari, tap **Share → Add to Home
Screen**, and launch Paisa from the home-screen icon. Removing that icon
deletes the app's data, so keep a backup (PR 4).

## Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Start the dev server |
| `npm run web` | Start the dev server for the browser |
| `npm run build:web` | Export the web build with service worker and `_headers` |
| `npm run serve:web` | Serve `dist/` locally with production headers |
| `npm run e2e` | Playwright WebKit E2E against `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Jest |
| `npm run verify` | Typecheck + lint + tests (run before every push) |

Always install packages with `npx expo install <pkg>` so versions match SDK 58.

## Project structure

```
src/
  app/          routes (Expo Router) — screens only
  components/   design-system primitives and navigation helpers
  db/           schema, migrations, repositories
  lib/          pure logic (money, dates, parsing) — unit tested
  theme/        design tokens and ThemeProvider
docs/           the project's memory; read these before changing code
```

## Documentation

| Doc | Read it when |
| --- | --- |
| [docs/FEATURES.md](docs/FEATURES.md) | You need to know what we build and why |
| [docs/ROADMAP.md](docs/ROADMAP.md) | You need to know what is next |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | You are touching data, money, dates, or migrations |
| [docs/DESIGN.md](docs/DESIGN.md) | You are touching UI |
| [docs/SECURITY.md](docs/SECURITY.md) | You are adding a dependency, query, import, or export |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | You are opening or reviewing a PR |

## Stack

Expo SDK 58 · React Native 0.88 + react-native-web · React 19 · TypeScript
(strict) · Expo Router · expo-sqlite (WASM, OPFS) · Jest · Playwright ·
GitHub Actions.

## Contributing

Feature branches only, one feature per PR, tests first, and three review agents
(test, security, pen-test — see `.claude/agents/`) before merge. See
[docs/WORKFLOW.md](docs/WORKFLOW.md).

## Licence

Private project. All rights reserved.
