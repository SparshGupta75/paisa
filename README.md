# Paisa

A private, offline-first expense tracker for iPhone. Rupees in, rupees out — no
account, no cloud, no ads. It installs from Safari to the home screen as a web
app (PWA), and everything lives in SQLite on the device.

> **Status: early.** PR 1 (foundation) is merged. Next is PR 2, which turns the
> app into an installable PWA. See [docs/ROADMAP.md](docs/ROADMAP.md), and
> [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#platform-decision) for why it is a
> web app rather than a native one.

## Run it

Until PR 2, development runs in **Expo Go** (the web build needs PR 2's
`metro.config.js` for SQLite):

```bash
npm install
npx expo start
```

Scan the QR code with the iPhone camera and open it in Expo Go. From PR 2,
`npx expo start --web` and Safari replace this.

On the iPhone (from PR 2): open the deployed URL in Safari, tap **Share → Add to
Home Screen**, and launch Paisa from the home-screen icon. Removing that icon
deletes the app's data, so keep a backup (PR 4).

## Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Start the dev server |
| `npm run web` | Start the dev server for the browser |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Jest |
| `npm run verify` | Typecheck + lint + tests (run before every push) |
| `npx expo export --platform web --output-dir /tmp/paisa-web` | Bundle smoke test |

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
