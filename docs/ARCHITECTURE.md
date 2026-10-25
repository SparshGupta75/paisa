# Architecture

## Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Runtime | Expo SDK 58, React Native 0.88, React 19.3 | New Architecture enabled |
| Language | TypeScript, `strict` + `noUncheckedIndexedAccess` | No `any` without a comment justifying it |
| Navigation | Expo Router 58, native stack per tab, `NativeTabs` | Real `UINavigationController` / `UITabBar` |
| Storage | `expo-sqlite` (SQLite, WAL) | Local-only; no backend |
| Icons | `expo-symbols` (SF Symbols) | iOS-first |
| Haptics / blur | `expo-haptics`, `expo-blur` | Used sparingly, see `DESIGN.md` |
| Tests | Jest 30 + `jest-expo` | Pure logic tested; no snapshot soup |
| CI | GitHub Actions | typecheck → lint → test → iOS bundle |

No network calls, no analytics SDK, no crash reporter. That is a product decision,
not a temporary state: the data is the user's and it does not leave the device.

## Directory layout

```
src/
  app/                    # routes only — every file here is a screen
    _layout.tsx           # providers: theme, SQLite, root stack
    (tabs)/
      _layout.tsx         # native tab bar
      (home)/             # each tab owns its own stack
      (activity)/
      (budgets)/
      (settings)/
  components/
    nav/TabStack.tsx      # shared native-stack options
    ui/                   # design-system primitives
  db/
    migrate.ts            # append-only migrations
    repositories/         # (PR 2) typed query modules, one per aggregate
  lib/                    # pure functions: money, dates, parsing, csv
  theme/                  # tokens + ThemeProvider
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
applied version; each migration runs inside `withExclusiveTransactionAsync`.

Rules:

1. Never edit or reorder a shipped migration.
2. Never reuse a version number.
3. Every migration must be safe on a device that already has data.
4. Add indexes in the same PR that introduces the query needing them.
5. Destructive changes need a data-preserving two-step migration.

`SQLiteProvider` + `useSuspense` guarantees no screen mounts before migrations
finish.

## Identifiers

Primary keys are `TEXT` UUIDs (generated with `expo-crypto.randomUUID()`), not
autoincrement integers. Rationale: a future sync feature cannot merge two
devices' integer sequences, and changing primary keys later is a migration
nightmare. The cost today is a few bytes per row.

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

- Migrations: failure must surface loudly (a red screen in dev, a blocking
  recovery screen in production). Never swallow.
- Queries: return typed results; throw on programmer error (bad SQL), return
  empty for "no rows".
- Validation: `parseAmountToPaise` returns `null` rather than throwing, because
  invalid input is expected, not exceptional.
- No `console.log` of amounts, notes, or account names — logs are readable by
  anyone with the device or a debugger.

## Performance budget

| Target | Budget |
| --- | --- |
| Cold start to first screen | < 1.5 s on iPhone 12 |
| Add-expense flow | < 300 ms from tap to saved |
| Activity list scroll | 60 fps at 5,000 rows |
| Home summary query | < 30 ms |

If a query exceeds its budget, add an index before adding a cache.

## Known constraints

- **SQLCipher is unavailable in Expo Go.** Encryption (PR 10) requires a
  development build. Until then, the database is unencrypted on disk.
- **`expo-symbols` is iOS-only.** Other platforms get a glyph fallback.
- **No background execution.** Recurring transactions materialise on app open,
  not via a scheduler.
