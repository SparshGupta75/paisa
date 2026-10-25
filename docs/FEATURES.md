# Paisa — feature catalogue

The single source of truth for **what Paisa does and why**. Read this instead of
re-deriving the product from code. Update the status column in the same PR that
ships a feature; a stale status is a documentation bug.

| Status | Meaning |
| --- | --- |
| ✅ Shipped | Merged to `main` and manually verified on an iPhone simulator |
| 🚧 In PR | Implemented on a branch, awaiting review |
| 📋 Planned | Agreed, has a roadmap slot |
| 💤 Deferred | Agreed, no slot yet |
| ❌ Cut | Deliberately not building (see [Non-goals](#non-goals)) |

Guiding principle: **entry speed beats analytics**. A tracker people stop
updating is worthless, no matter how good the charts are. Every design decision
trades in favour of logging an expense in under three seconds.

---

## A. Core ledger (without these it is a toy)

| ID | Feature | Why it matters | Status | PR |
| --- | --- | --- | --- | --- |
| F-01 | Fast manual entry | Amount first, then optional category/note. Target: under 3 seconds per expense. | 📋 Planned | #2 |
| F-02 | Multiple accounts | Cash, bank, credit card, wallet — each with a running balance. | 📋 Planned | #3 |
| F-03 | Recurring transactions | Rent, salary, EMIs, subscriptions should not be typed twice. | 📋 Planned | #9 |
| F-04 | Budgets | Per-category monthly limits with a live "remaining" bar. | 📋 Planned | #4 |
| F-05 | Categories + tags | Fixed categories for reporting; freeform tags (`#goa-trip`) for real life. | 📋 Planned | #2 |
| F-06 | Search, edit, audit trail | People mis-enter constantly; corrections must be one tap away. | 📋 Planned | #7 |
| F-07 | CSV import / export | The escape hatch that makes people trust the app with their data. | 📋 Planned | #8 |

## B. What makes it feel modern

| ID | Feature | Why it matters | Status | PR |
| --- | --- | --- | --- | --- |
| F-08 | Natural-language quick add | Type `chai 40 yesterday` and it parses amount, date, category. | 📋 Planned | #5 |
| F-09 | Receipt photo → OCR | Snap a bill, prefill merchant/amount/date. | 📋 Planned | #11 |
| F-10 | Smart inbox / review queue | Import, then swipe to categorise. The best UX pattern in modern trackers (Copilot, Monarch). | 📋 Planned | #12 |
| F-11 | Auto-categorisation rules | "Merchant contains SWIGGY → Food delivery". Rules first, ML only if rules prove insufficient. | 📋 Planned | #12 |
| F-12 | Subscription detection | Spot repeating charges, flag price hikes and forgotten renewals. Saves real money. | 📋 Planned | #9 |
| F-13 | Safe-to-spend today | One number: remaining budget ÷ days left in month. | 📋 Planned | #4 |
| F-14 | Insights, not just pie charts | Month-over-month deltas, anomaly flags, projected month-end total. | 📋 Planned | #6 |
| F-15 | Calendar heatmap | Daily spend intensity; reveals weekend and payday patterns instantly. | 📋 Planned | #6 |
| F-16 | Offline-first sync | No spinners, works on the metro. Sync is a later concern; local SQLite is the source of truth. | 💤 Deferred | — |
| F-17 | Widget + share sheet | One-tap entry from the home screen or any app. | 📋 Planned | #13 |
| F-18 | Face ID + encryption | Biometric gate and encrypted database. Non-negotiable for financial data. | 📋 Planned | #10 |

## C. Differentiators (pick deliberately, not all at once)

| ID | Feature | Why it matters | Status | PR |
| --- | --- | --- | --- | --- |
| F-19 | Split expenses with friends | Shared trip/household ledgers with settle-up. Needs identity + sync; expensive. | 💤 Deferred | — |
| F-20 | Savings goals + net worth | Turns a spend diary into a money app. | 💤 Deferred | — |
| F-21 | AI monthly narrative | "You spent ₹4,200 more; 60% was food delivery after 10pm." | 💤 Deferred | — |
| F-22 | What-if simulator | "Cut dining 30% → save ₹3,100/mo → hit the Goa goal sooner." | 💤 Deferred | — |
| F-23 | Gamification | Streaks and savings challenges. Effective but easy to make gimmicky. | 💤 Deferred | — |

## D. India-specific

| ID | Feature | Why it matters | Status | PR |
| --- | --- | --- | --- | --- |
| F-24 | UPI / GPay / PhonePe statement import | Most Indian spending is UPI. Without this, manual entry is a losing battle. | 📋 Planned | #14 |
| F-25 | Bank SMS / email parsing | Transaction alerts are structured and reliable. | 💤 Deferred | — |
| F-26 | UPI merchant string cleanup | `UPI/DR/4123/SWIGGY@YBL` must become "Swiggy". | 📋 Planned | #14 |

## E. Non-goals

Explicitly out of scope so agents do not "helpfully" add them.

| ID | Not building | Reason |
| --- | --- | --- |
| X-01 | Bank API aggregators (AA/Setu/Plaid) | Slow, expensive, fragile, and unnecessary while statement import works. |
| X-02 | Crypto portfolio tracking | Different product, different user. |
| X-03 | Double-entry accounting | Our user wants to know where money went, not to close the books. |
| X-04 | Social feeds / leaderboards | Spending is private. Public comparison is a trust risk. |
| X-05 | Web-first dashboard | iPhone is the product. Web exists only as a debugging convenience. |

---

## Definition of done for a feature

A feature is only ✅ when all of these are true:

1. Typecheck, lint, and tests pass locally and in CI.
2. New logic has unit tests; money and date logic always does.
3. Manually exercised on an iOS simulator in **both** light and dark mode.
4. Empty, loading, and error states exist — not just the happy path.
5. No hardcoded colours, font sizes, or spacing (use `useTheme()`).
6. This table is updated, and `docs/ROADMAP.md` is ticked.
7. Security checklist in `.github/pull_request_template.md` reviewed.
