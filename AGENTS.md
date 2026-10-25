# AGENTS.md

Operating instructions for AI agents working in this repo.

## 60-second brief

Paisa is a local-only iPhone expense tracker (Expo SDK 58, React Native 0.88,
TypeScript strict, expo-sqlite). Money is **integer paise**. Dates use
`occurred_on` as a local `YYYY-MM-DD` string. No backend, no telemetry. iOS-native
UI only. One feature per PR, second-agent review required before merge.

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
npx expo start --ios         # simulator
npx expo export --platform ios --output-dir /tmp/paisa-export   # bundle smoke test
```

Run `npm run verify` before claiming any task is complete. If you cannot run the
simulator, say so explicitly rather than implying visual verification.

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
8. Do not create or edit `ios/` or `android/` — configure native behaviour in
   `app.json` and config plugins (CNG).
9. Do not run `npm audit fix --force`; it downgrades Expo to SDK 44. See
   `docs/SECURITY.md#accepted-risks`.
10. One feature per PR. Do not sneak refactors into a feature branch.

## Token discipline

- Prefer reading the specific doc section over grepping the whole codebase.
- Prefer the installed `.d.ts` over fetching a docs page, when one exists.
- Do not restate the docs in your response; link to the file and line.
- When something is ambiguous, ask one focused question instead of guessing and
  rewriting afterwards.
