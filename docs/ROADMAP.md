# Roadmap

One feature per pull request. Each PR is independently reviewable, independently
revertable, and leaves `main` shippable. Roadmap numbers are plan slots, not
GitHub PR numbers.

Status legend: `[x]` merged · `[~]` in review · `[ ]` not started.

## PR 1 — Foundation ✅

- [x] Expo SDK 58 + React Native 0.88 + TypeScript strict
- [x] Expo Router, tab layout, per-tab stacks
- [x] Design system (`src/theme`, grouped-list primitives)
- [x] SQLite + append-only migration runner (`src/db/migrate.ts`)
- [x] Money module with integer-paise invariant + tests
- [x] CI (typecheck, lint, test, bundle), PR template, docs

## PR 2 — Web platform (PWA shell) 🚧

Moves the target from Expo Go to an installable web app. See
[ARCHITECTURE.md#platform-decision](ARCHITECTURE.md#platform-decision). This is
partly a spike: if an exit criterion fails, stop and report before PR 3.

- [~] Metro bundles `.wasm`; dev server sends the production headers (`metro.config.js`)
- [~] Security headers and CSP on every path, from one module (`scripts/web/headers.js`)
- [~] Web app manifest, `apple-touch-icon`, standalone display, theme colours
- [~] Generated service worker that precaches the whole export; offline cold start
- [~] `navigator.storage.persist()` requested on launch
- [~] Ionicons replace SF Symbols behind a semantic `<Icon>` API
- [~] JS bottom tab bar (`NativeTabs` is a top pill on the web); each tab has its own URL
- [~] Playwright (WebKit, iPhone 15) E2E in CI; CI exports web instead of iOS
- [~] Home and Settings copy fixed; Home spacing uses tokens
- [ ] **Deploy** to Cloudflare Pages or Netlify (both honour `_headers`) on a
  permanent custom domain with a preview environment. Needs the owner's host
  account and domain; not done in code.

**Exit criteria (on a real iPhone, installed to the home screen).** Items 1 and
3 pass in Playwright WebKit; all four still need the phone:
1. `crossOriginIsolated === true` and `SharedArrayBuffer` exists — online, and
   again on an offline cold start served from the service-worker cache.
2. A row written to SQLite survives closing the app and a phone restart.
3. Cold start works in Airplane Mode.
4. Data is still present after 8+ days without opening the app (tracked after
   merge; blocks PR 5).

**Fallback:** if OPFS persistence fails, evaluate an IndexedDB-backed SQLite VFS
before writing any feature.

## PR 3 — Core ledger

**F-01, F-05.** `accounts` (seeded "Bank" and "Cash"), `categories`,
`transactions` tables; amount-first add sheet; edit and delete; activity list
grouped by day; home month summary. Also: the shared `ConfirmSheet` component
and the `node:sqlite` test adapter for integration tests.

**Acceptance:** add → appears in activity and home totals without a reload;
editing recalculates both; deleting removes it; all queries parameterised.

## PR 4 — Backup and export

**F-07 (export + restore).** JSON backup of the whole database (optional
passphrase encryption via WebCrypto) and CSV export,
saved through the share sheet / Files. Restore from a backup file with a dry-run
summary. A gentle "last backup N days ago" reminder on Home. Moved early because
removing the home-screen app deletes its data.

## PR 5 — Bank statement import

**F-24 (CSV/XLS), F-26, F-07 (CSV import).** File picker, per-bank column
mapping, dry-run preview, duplicate detection, UPI merchant cleanup. Imported
rows go to a pending state.

## PR 6 — Review inbox and rules

**F-10, F-11.** Queue of pending imported rows, swipe/tap to categorise, "always
do this" creates a rule; rule management screen.

## PR 7 — Natural-language quick add

**F-08.** Parser for `amount [merchant] [date] [tag]`. Pure function with a large
test table; no AI call. Falls back to the manual form when confidence is low.

## PR 8 — Accounts

**F-02.** Account CRUD, per-account balances (derived, never stored), account
filter, transfers.

## PR 9 — Budgets

**F-04, F-13.** Monthly per-category budgets, progress bars, safe-to-spend
headline, overspend warnings.

## PR 10 — Recurring and subscriptions

**F-03, F-12.** Recurring rules materialised on app open; subscription detection
over imported history; price-hike flags.

## PR 11 — Insights

**F-14, F-15.** Month-over-month deltas, projected month-end, calendar heatmap.
Charts render from SQL aggregates.

## PR 12 — Search and edit history

**F-06.** Search over note/merchant, filters, soft delete with Undo.

## PR 13 — App lock

**F-18.** Passkey (WebAuthn, platform authenticator) on launch and on resume
after 60 s; blur the UI when the app is backgrounded.

## PR 14 — PDF statement import (spike)

**F-24 (PDF).** PhonePe/Paytm PDF statements. Starts as a time-boxed spike: if
text extraction in the browser is unreliable, record the result and drop it.

## Later / unscheduled

F-20 (goals/net worth), F-19 (local trip ledger), F-21 (template narrative),
F-22 (what-if), F-23 (gamification), encryption at rest (WebAuthn PRF-derived
key — research only).

Cut: F-09, F-16, F-17, F-25 — see [FEATURES.md](FEATURES.md#e-cut-features).

## Sequencing rationale

1. **Platform before features.** If SQLite-in-the-browser does not persist on
   iOS, every feature built on it is wasted.
2. **Ledger, then backup.** The first real data must be exportable before more of
   it arrives.
3. **Import before polish.** With ~90% UPI spend, import is the app; quick add,
   budgets, and insights are only as good as the data under them.
4. **Rules before ML.** Deterministic and debuggable.
5. **Local before sync.** And in this product, local only.
