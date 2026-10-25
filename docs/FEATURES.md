# Paisa — feature catalogue

The single source of truth for **what Paisa does and why**. Read this instead of
re-deriving the product from code. Update the status column in the same PR that
ships a feature; a stale status is a documentation bug.

| Status | Meaning |
| --- | --- |
| ✅ Shipped | Merged to `main` and verified in the installed PWA on an iPhone |
| 🚧 In PR | Implemented on a branch, awaiting review |
| 📋 Planned | Agreed, has a roadmap slot |
| 💤 Deferred | Agreed, no slot yet |
| ❌ Cut | Deliberately not building (see [Cut features](#e-cut-features) and [Non-goals](#f-non-goals)) |

Guiding principles:

1. **Import beats typing.** About 90% of the owner's spending is UPI. Statement
   import is the primary way data enters Paisa; manual entry is the fallback for
   cash and the odd card payment.
2. **Entry speed beats analytics.** When typing is needed, logging an expense
   must take under three seconds.
3. **Runs without an Apple Developer account.** Paisa ships as an installable
   web app (PWA) added to the iPhone home screen. Any feature that needs a
   native iOS build is out (see [ARCHITECTURE.md](ARCHITECTURE.md#platform-decision)).

---

## A. Core ledger (without these it is a toy)

| ID | Feature | Why it matters | Status | PR |
| --- | --- | --- | --- | --- |
| F-01 | Fast manual entry | Amount first, then optional category/note. Target: under 3 seconds per expense. | 📋 Planned | #3 |
| F-02 | Multiple accounts | Cash, bank, credit card, wallet — each with a running balance. | 📋 Planned | #8 |
| F-03 | Recurring transactions | Rent, salary, EMIs, subscriptions should not be typed twice. Materialised when the app opens (no background jobs on the web). | 📋 Planned | #10 |
| F-04 | Budgets | Per-category monthly limits with a live "remaining" bar. | 📋 Planned | #9 |
| F-05 | Categories + tags | Fixed categories for reporting; freeform tags (`#goa-trip`) for real life. | 📋 Planned | #3 |
| F-06 | Search + edit history | People mis-enter constantly; corrections must be one tap away. Soft delete, `updated_at`, and an Undo toast — not a full audit log (single user, single device). | 📋 Planned | #12 |
| F-07 | Backup, CSV import / export | The escape hatch, and on the web the **only** protection against losing data when the home-screen app is removed. Export and restore ship early; CSV import ships with statement import. | 📋 Planned | #4 |

## B. What makes it feel modern

| ID | Feature | Why it matters | Status | PR |
| --- | --- | --- | --- | --- |
| F-08 | Natural-language quick add | Type `chai 40 yesterday` and it parses amount, date, category. | 📋 Planned | #7 |
| F-10 | Review inbox | Imported rows land in a queue; swipe to categorise. The best UX pattern in modern trackers (Copilot, Monarch). | 📋 Planned | #6 |
| F-11 | Auto-categorisation rules | "Merchant contains SWIGGY → Food delivery". Rules first, ML only if rules prove insufficient. | 📋 Planned | #6 |
| F-12 | Subscription detection | Spot repeating charges (UPI autopay, OTT, SaaS), flag price hikes and forgotten renewals. Works well on imported data. | 📋 Planned | #10 |
| F-13 | Safe-to-spend today | One number: remaining budget ÷ days left in month. | 📋 Planned | #9 |
| F-14 | Insights, not just pie charts | Month-over-month deltas and projected month-end total first; anomaly flags later. | 📋 Planned | #11 |
| F-15 | Calendar heatmap | Daily spend intensity; reveals weekend and payday patterns instantly. | 📋 Planned | #11 |
| F-18 | App lock | Passkey (Face ID via WebAuthn) gate on open and on resume. A privacy screen, not encryption — see [SECURITY.md](SECURITY.md#threat-model). Encryption at rest is deferred. | 📋 Planned | #13 |

## C. Differentiators (pick deliberately, not all at once)

None picked yet. Candidates, in order of fit:

| ID | Feature | Why it matters | Status | PR |
| --- | --- | --- | --- | --- |
| F-20 | Savings goals + net worth | Turns a spend diary into a money app. | 💤 Deferred | — |
| F-19 | Trip / household ledger | Local-only variant: tag-based shared ledger with manual settle-up. No friend accounts, no sync. | 💤 Deferred | — |
| F-21 | Monthly narrative | "You spent ₹4,200 more; 60% was food delivery after 10pm." Built from offline templates over SQL aggregates. An AI call would send data off-device and needs an explicit product decision first. | 💤 Deferred | — |
| F-22 | What-if simulator | "Cut dining 30% → save ₹3,100/mo." Only meaningful once F-20 exists. | 💤 Deferred | — |
| F-23 | Gamification | Streaks and savings challenges. Effective but easy to make gimmicky. | 💤 Deferred | — |

## D. India-specific

| ID | Feature | Why it matters | Status | PR |
| --- | --- | --- | --- | --- |
| F-24 | Statement import | Bank CSV/XLS statements first — every UPI payment appears there. PhonePe/Paytm PDF statements later, only if a PDF spike proves reliable in the browser. | 📋 Planned | #5 (bank) · #14 (PDF) |
| F-26 | UPI merchant cleanup | `UPI/DR/4123/SWIGGY@YBL` must become "Swiggy". Pure parser with a large test table. | 📋 Planned | #5 |

## E. Cut features

Decided on 2026-10-25 after choosing the PWA route.

| ID | Feature | Reason |
| --- | --- | --- |
| F-09 | Receipt photo → OCR | ~90% of spend is UPI, so there are few paper receipts. Browser OCR (WASM) is heavy for little gain. |
| F-16 | Cloud sync | Contradicts "data never leaves the device". Backup files (F-07) cover moving to a new phone. |
| F-17 | Widget + share sheet | Widgets need a native build. iOS does not support the Web Share Target API, and links from Shortcuts open in Safari, whose storage is separate from the home-screen app. |
| F-25 | Bank SMS / email parsing | iOS gives no app (native or web) access to SMS. Email parsing needs a server. |

## F. Non-goals

Explicitly out of scope so agents do not "helpfully" add them.

| ID | Not building | Reason |
| --- | --- | --- |
| X-01 | Bank API aggregators (AA/Setu/Plaid) | Slow, expensive, fragile, and unnecessary while statement import works. |
| X-02 | Crypto portfolio tracking | Different product, different user. |
| X-03 | Double-entry accounting | Our user wants to know where money went, not to close the books. |
| X-04 | Social feeds / leaderboards | Spending is private. Public comparison is a trust risk. |
| X-05 | Desktop dashboard | The product is the iPhone home-screen app. Desktop browsers work only as a debugging convenience; no layout work for wide screens. |
| X-06 | A backend | Static hosting serves the app's code only. No API, no database, no accounts on any server. |

---

## Definition of done for a feature

A feature is only ✅ when all of these are true:

1. Typecheck, lint, unit, integration, and E2E tests pass locally and in CI.
2. Tests were written first (see [WORKFLOW.md](WORKFLOW.md#3-build-test-first)); money, date, and parser logic always has a test table.
3. The three review agents (test, security, pen-test) found no open P0/P1.
4. Exercised in the **installed** PWA on an iPhone (or the iOS Simulator's Safari, added to the home screen), in light and dark mode, including a cold start in Airplane Mode.
5. Empty, loading, and error states exist — not just the happy path.
6. No hardcoded colours, font sizes, or spacing (use `useTheme()`).
7. This table is updated, and `docs/ROADMAP.md` is ticked.
