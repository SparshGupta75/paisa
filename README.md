# Paisa

A private, offline-first expense tracker for iPhone. Rupees in, rupees out — no
account, no cloud, no ads. Everything lives in SQLite on the device.

> **Status: early.** PR 1 (foundation) is merged: native navigation shell, iOS
> design system, database + migrations, CI, and documentation. The ledger itself
> lands in PR 2. See [docs/ROADMAP.md](docs/ROADMAP.md).

## Run it on your iPhone

No Apple Developer account needed — Expo Go handles it.

1. Install **Expo Go** from the App Store on your iPhone.
2. On your Mac:

   ```bash
   npm install
   npx expo start
   ```

3. Make sure the phone and Mac are on the same Wi-Fi, then scan the QR code with
   the iPhone camera and open it in Expo Go.

If your network blocks local connections, use `npx expo start --tunnel`.

iOS Simulator instead: `npx expo start --ios`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Start the dev server |
| `npm run ios` | Open in the iOS Simulator |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Jest |
| `npm run verify` | Typecheck + lint + tests (run before every push) |
| `npx expo export --platform ios --output-dir /tmp/paisa-export` | Bundle smoke test |

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

Expo SDK 58 · React Native 0.88 · React 19 · TypeScript (strict) · Expo Router ·
expo-sqlite · Jest · GitHub Actions.

## Contributing

Feature branches only, one feature per PR, second-agent review required. See
[docs/WORKFLOW.md](docs/WORKFLOW.md).

## Licence

Private project. All rights reserved.
