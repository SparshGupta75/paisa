# AGENTS.md

Operating instructions for AI agents working in this repo.

## 60-second brief

Paisa is a local-only expense tracker that ships as an **installable web app
(PWA) on iPhone** — there is no Apple Developer account (Expo SDK 58, React
Native 0.88 via react-native-web, TypeScript strict, expo-sqlite on WASM/OPFS).
Money is **integer paise**. Dates use `occurred_on` as a local `YYYY-MM-DD`
string. No backend, no telemetry. iOS look, web runtime. ~90% of the owner's
spend is UPI, so statement import is the core feature. One feature per PR, tests
first, three review agents (test, security, pen-test) before merge.

## Read docs instead of re-deriving them

Do not explore the repo to reconstruct intent. Read the doc for the task:

| Task | Doc |
| --- | --- |
| What to build / whether it is in scope | `docs/FEATURES.md` |
| What is next / PR numbering | `docs/ROADMAP.md` |
| Schema, money, dates, migrations, folders | `docs/ARCHITECTURE.md` |
| Any UI, styling, component, or copy | `docs/DESIGN.md` |
| Dependency, SQL, import/export, logging | `docs/SECURITY.md` |
| Branch, commit, PR, review protocol | `docs/WORKFLOW.md` |

Update `docs/FEATURES.md` and `docs/ROADMAP.md` in the same PR that changes
behaviour. Stale docs are treated as bugs.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely
renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or
React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch `https://docs.expo.dev/llms.txt`.
4. When the installed package is ambiguous, read its `.d.ts` in `node_modules` —
   that is ground truth for this exact version.

## Commands

```bash
npx expo install <package>   # ALWAYS, instead of npm install for Expo modules
npm run verify               # typecheck + lint + test — run before declaring done
npx expo start --web         # dev server; open in Safari (from PR 2; Expo Go before that)
npx expo export --platform web --output-dir /tmp/paisa-web   # bundle smoke test (fails until PR 2 adds metro.config.js)
```

Run `npm run verify` before claiming any task is complete. If you could not test
in the installed PWA on an iPhone or the Simulator's Safari, say so explicitly
rather than implying visual verification.

## Hard rules

1. Routes in `src/app` contain no business logic; screens compose hooks and
   components.
2. All SQL lives in `src/db`. Parameterised statements only. No string
   interpolation except integer-validated `PRAGMA user_version` in migrations.
3. Money is never a float, never a string, once inside the domain. Use
   `src/lib/money.ts` at the boundaries.
4. Never edit or reorder a shipped migration. Append a new one.
5. No hardcoded colours, font sizes, or spacing in components — use `useTheme()`.
6. Never `console.log` amounts, notes, merchant names, or account names.
7. Do not add a dependency without a stated reason in the PR description.
8. Do not add native-only code or modules (`ios/`, `android/`, config plugins
   for native features). Anything that does not work in iOS Safari is out of
   scope — see `docs/ARCHITECTURE.md#platform-decision`.
9. Do not run `npm audit fix --force`; it downgrades Expo to SDK 44. See
   `docs/SECURITY.md#accepted-risks`.
10. One feature per PR. Do not sneak refactors into a feature branch.
11. Tests before implementation, in a separate commit (`docs/WORKFLOW.md#3-build-test-first`).
    Missing tests for money/date/parser logic is P1; wrong commit order is P2.
12. A PR is not done until `test-reviewer`, `security-reviewer`, and `pen-tester`
    (`.claude/agents/`) have reported and every P0/P1 is fixed.
13. Never use React Native `Alert` (no-op on web), SF Symbols, haptics, or any
    third-party origin (CDN, web font, analytics). Existing SF Symbol uses
    (`Icon.tsx`, the tab layout) are replaced in PR 2.

## Skills

Project skills live in `.claude/skills/` (see its README for sources and pinned
commits): `/ponytail` (smallest complete change), `/ponytail-review`,
`/ponytail-audit`, `/ponytail-debt`, and `/graphify` (codebase knowledge graph;
user-invoked only, because it installs a Python package). Project rules in this
file and `docs/` override any skill.

## Token discipline

- Prefer reading the specific doc section over grepping the whole codebase.
- Prefer the installed `.d.ts` over fetching a docs page, when one exists.
- Do not restate the docs in your response; link to the file and line.
- When something is ambiguous, ask one focused question instead of guessing and
  rewriting afterwards.
