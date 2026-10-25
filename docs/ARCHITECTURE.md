# Architecture

## Platform decision

**Paisa ships as an installable web app (PWA), added to the iPhone home screen
from Safari.** Decided 2026-10-25.

Why: there is no paid Apple Developer account. The alternatives considered:

| Option | Why not |
| --- | --- |
| Expo Go | Loads the app from a dev server or a published update; offline cold start is not documented as supported (forum reports say it needs a connection), and only the native modules bundled in Expo Go are available. Fine for development, not for daily use. |
| Free Apple ID + Xcode build | Works offline, but the provisioning profile expires after 7 days and the app stops launching until it is reinstalled from the Mac. |
| **PWA** | Works offline, never expires, needs no Mac after deploy. Costs: no widgets, no SF Symbols, no haptics, no SQLCipher. |

Consequences, enforced elsewhere in the docs:

- iOS-native code (`ios/`, config plugins, native-only modules) is out of scope.
  Code stays React Native + `react-native-web`, so a native build remains
  possible later, but nothing is built for it.
- Desktop browsers are a debugging convenience only (X-05).
- The host serves static files only (X-06). It never sees user data.

## Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Runtime | Expo SDK 58, React Native 0.88 via `react-native-web`, React 19.3 | Target: Safari on iOS 16+, installed to home screen. iOS 16 is the minimum (CSP `'wasm-unsafe-eval'`) |
| Language | TypeScript, `strict` + `noUncheckedIndexedAccess` | No `any` without a comment justifying it |
| Navigation | Expo Router 58, stack per tab | Verify `NativeTabs` on web in PR 2; fall back to JS `Tabs` |
| Storage | `expo-sqlite` web (wa-sqlite WASM, OPFS `AccessHandlePoolVFS`, in a worker) | Requires cross-origin isolation — see below |
| Offline | Service worker precaching the exported app shell | Added in PR 2 |
| Icons | Open-licence web icon set (chosen in PR 2) | SF Symbols are licensed for Apple platforms only |
| Tests | Jest 30 + `jest-expo` (unit, integration); Playwright WebKit (E2E) | Playwright runs on Linux CI with an iPhone viewport |
| CI | GitHub Actions | typecheck → lint → test → web export → E2E |
| Hosting | Static host that sets custom headers (EAS Hosting or Cloudflare Pages) | GitHub Pages cannot set COOP/COEP |

No network calls after the app shell loads, no analytics SDK, no crash reporter.
That is a product decision, not a temporary state: the data is the user's and it
does not leave the device.

## SQLite on the web

`expo-sqlite` on web needs `SharedArrayBuffer`, which only exists when the page
is **cross-origin isolated**. Source of truth:
`node_modules/expo-sqlite/skills/expo-sqlite/references/web-and-config.md`.

- (PR 2) `metro.config.js` adds `wasm` to `assetExts` and sends COOP/COEP headers from
  the dev server.
- The production host must send `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: require-corp` on every path. Expo's docs use
  `credentialless`, but Safari is not known to support it; Paisa loads no
  third-party resources, so `require-corp` is safe. The dev server in
  `metro.config.js` uses the same value.
- The origin is permanent. OPFS data and passkeys are bound to it, so the app
  lives on one custom domain chosen in PR 2 and never moves.
- `withExclusiveTransactionAsync()` and a custom database `directory` are not
  supported on web. Migrations already use `withTransactionAsync`.
- Storage: Safari keeps home-screen web apps' storage separate from Safari's
  and exempts them from the 7-day script-storage cap. Persistence is still
  best-effort, so the app calls `navigator.storage.persist()` and backups (F-07)
  are a core feature, not an extra.
- **Removing the home-screen icon deletes all data.** Say so in onboarding and in
  Settings, next to the backup button.

## Directory layout

```
src/
  app/                    # routes only — every file here is a screen
    _layout.tsx           # providers: theme, SQLite, root stack
    (tabs)/
      _layout.tsx         # tab bar
      (home)/             # each tab owns its own stack
      (activity)/
      (budgets)/
      (settings)/
  components/
    nav/TabStack.tsx      # shared native-stack options
    ui/                   # design-system primitives
  db/
    migrate.ts            # append-only migrations
    repositories/         # (PR 3) typed query modules, one per aggregate
  lib/                    # pure functions: money, dates, parsing, csv
  theme/                  # tokens + ThemeProvider
e2e/                      # (PR 2) Playwright specs, WebKit + iPhone viewport
public/                   # (PR 2) manifest, icons, service worker, _headers
docs/                     # this folder — the project's memory
```

Rules:

- **Routes contain no business logic.** They compose hooks and components.
- **`src/lib` is pure.** No React, no SQLite. This is what gets unit tested.
- **`src/db` owns all SQL.** Screens never write queries; they call a repository.
- **Components never hardcode style values.** Read tokens from `useTheme()`.

## Money

Every monetary value is an **integer number of paise** (₹1 = 100 paise).

- Storage: `INTEGER` columns, always non-null, never floats.
- Arithmetic: integers only. Percentages are computed then rounded at the end.
- Boundaries: strings only at the UI edge. Parse with `parseAmountToPaise`,
  render with `formatINR`. A `number` in the domain layer is always paise.
- Why: `0.1 + 0.2 !== 0.3`. A tracker that drifts by a paisa loses trust.

## Dates and time

The distinction that prevents most reporting bugs:

- `occurred_on` — the local calendar date of the expense, stored as `TEXT`
  `YYYY-MM-DD`. This is what "this month", budgets, and heatmaps group by.
- `created_at` / `updated_at` — true instants, stored as UTC ISO-8601.

Never derive `occurred_on` from `created_at` (a late-night entry in IST is the
previous day in UTC), and never store a `Date` object in SQLite.

## Migrations

`src/db/migrate.ts` holds an append-only array. `PRAGMA user_version` tracks the
applied version; each migration runs inside `withTransactionAsync`.

Why not `withExclusiveTransactionAsync`: that helper runs the callback on a
**second connection**, where the `PRAGMA foreign_keys = ON` set on the main
connection does not apply — and SQLite ignores that pragma once a transaction is
open. Migrations run before any screen mounts, so nothing else can join the
transaction, and staying on the main connection keeps foreign keys enforced.
`assertForeignKeysEnabled()` fails loudly if that assumption ever breaks.

Concurrent `onInit` calls (Fast Refresh, remount after error) share a single
in-flight promise, and each migration re-reads `user_version` before applying.

Rules:

1. Never edit or reorder a shipped migration.
2. Never reuse a version number.
3. Every migration must be safe on a device that already has data.
4. Add indexes in the same PR that introduces the query needing them.
5. Destructive changes need a data-preserving two-step migration.

`SQLiteProvider` + `useSuspense` guarantees no screen mounts before migrations
finish.

## Identifiers

Primary keys are `TEXT` UUIDs (generated with `crypto.randomUUID()`), not autoincrement integers. Rationale: restoring or merging a
backup cannot collide with existing rows, and changing primary keys later is a
migration nightmare. The cost is a few bytes per row.

## Data flow

```
Screen  →  hook  →  repository  →  expo-sqlite
   ↑                                    │
   └──────────  state  ←────────────────┘
```

- Reads return plain typed rows; no ORM, no lazy proxies.
- Writes are explicit and awaited; the caller decides what to refresh.
- Aggregate queries (month totals, category sums) run in SQL, not in JS loops.
- List screens use `FlatList` with `keyExtractor` and windowing; never `map`.

## Error handling

- Migrations: failure must surface loudly. It throws out of `SQLiteProvider`, and
  the root `ErrorBoundary` in `src/app/_layout.tsx` renders a recovery screen
  with a retry button. Never swallow.
- Queries: return typed results; throw on programmer error (bad SQL), return
  empty for "no rows".
- Validation: `parseAmountToPaise` returns `null` rather than throwing, because
  invalid input is expected, not exceptional.
- No `console.log` of amounts, notes, or account names — logs are readable by
  anyone with the device or a debugger.

## Performance budget

| Target | Budget |
| --- | --- |
| Cold start to first screen (installed PWA, offline) | < 2 s on iPhone 12 |
| App shell download (first install) | < 1.5 MB gzipped, WASM included — a target to confirm in PR 2 |
| Add-expense flow | < 300 ms from tap to saved |
| Activity list scroll | 60 fps at 5,000 rows |
| Home summary query | < 30 ms |

If a query exceeds its budget, add an index before adding a cache.

## Known constraints

- **No SQLCipher on the web.** The database is not encrypted by the app. iOS
  encrypts app storage while the phone is locked; the app lock (F-18) covers an
  unlocked phone. Encryption at rest is research only.
- **No background execution.** Recurring transactions materialise on app open.
  Web push would need a server, which is a non-goal.
- **Separate storage per context.** The home-screen app and Safari do not share
  storage. Links (Shortcuts, other apps) open in Safari, so deep-link quick add
  is not possible.
- **Deploys are code updates.** A new deploy reaches the phone through the
  service worker. Migrations must stay append-only and run against whatever
  version the device last had.
