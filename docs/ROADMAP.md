# Roadmap

One feature per pull request. Each PR is independently reviewable, independently
revertable, and leaves `main` shippable.

Status legend: `[x]` merged · `[~]` in review · `[ ]` not started.

## PR 1 — Foundation 🚧

- [~] Expo SDK 58 + React Native 0.88 + TypeScript strict
- [~] Expo Router (native stack per tab, native `UITabBar`)
- [~] iOS design system (`src/theme`, grouped-list primitives)
- [~] SQLite + append-only migration runner (`src/db/migrate.ts`)
- [~] Money module with integer-paise invariant + tests
- [~] CI (typecheck, lint, test, iOS bundle), PR template, docs

**Out of scope:** any actual expense data. The app intentionally shows honest
empty states until PR 2.

## PR 2 — Core ledger 🚧

Implements **F-01, F-05** and the account/category schema groundwork for F-02.

- `accounts`, `categories`, `transactions` tables + seed data
- Add expense: amount-first sheet, category picker, date, note
- Edit and delete with confirmation
- Activity list grouped by day, running day totals
- Home month summary (spent, count, average)

**Acceptance:** add → appears in activity and home totals without a reload;
editing recalculates both; deleting removes it; all queries parameterised.

## PR 3 — Accounts

**F-02.** Account CRUD, per-account balances, account filter, transfer between
accounts. Balances derive from transactions, never stored as a mutable column.

## PR 4 — Budgets

**F-04, F-13.** Monthly per-category budgets, progress bars, safe-to-spend
headline, overspend warnings. Budget periods are month-based, calculated from
`occurred_on` local dates.

## PR 5 — Natural-language quick add

**F-08.** Parser for `amount [merchant] [date] [tag]`. Pure function with a large
test table; no AI call. Falls back to the manual form when confidence is low.

## PR 6 — Insights

**F-14, F-15.** Month-over-month deltas, category trend, projection for month
end, calendar heatmap. Charts render from SQL aggregates, not full row scans.

## PR 7 — Search & filters

**F-06.** Full-text-ish search over note/merchant, filters by date range,
category, account, amount. FTS5 index if profiling shows a need.

## PR 8 — CSV import / export

**F-07.** Export with formula-injection protection. Import with a column-mapping
step, dry-run preview, and duplicate detection.

## PR 9 — Recurring & subscriptions

**F-03, F-12.** Recurring rules with next-run date, materialise on app open,
subscription detection heuristics, price-hike alerts.

## PR 10 — Face ID + encryption

**F-18.** `expo-local-authentication` gate on launch/background, SQLCipher via
`expo-sqlite` config plugin. **Requires a development build** — SQLCipher is not
available in Expo Go. This is the point where we move off Expo Go for daily use.

## PR 11 — Receipt OCR

**F-09.** Camera capture, OCR, merchant/amount/date extraction, attach image to
transaction.

## PR 12 — Smart inbox & rules

**F-10, F-11.** Review queue, accept/reject, rule engine ("merchant contains X →
category Y"), rule management UI.

## PR 13 — Widget & share sheet

**F-17.** iOS widget for quick add, share-sheet extension. Needs a development
build and an App Group shared container.

## PR 14 — India import

**F-24, F-26.** UPI/GPay/PhonePe statement parsing, merchant normalisation, bulk
review through the smart inbox.

## Later / unscheduled

F-16 (sync), F-19 (split), F-20 (goals/net worth), F-21 (AI narrative),
F-22 (what-if), F-23 (gamification), F-25 (SMS parsing).

## Sequencing rationale

1. **Ledger before analytics.** Charts over missing data are decoration.
2. **Local before sync.** Sync multiplies every bug; prove the model offline.
3. **Rules before ML.** Deterministic and debuggable. ML only if rules fail.
4. **Encryption before OCR.** Once receipt photos exist, the blast radius of an
   unencrypted database grows a lot.
5. **Import last.** It is the highest-leverage feature but needs the review queue
   and rules to be usable.
