# Engineering workflow

One feature per pull request. Every PR — and every build of `main` — is checked
by three independent review agents (tests, security, pen-test) before it
counts as done. This file is the contract; follow it
exactly so context does not have to be re-explained.

## 1. Pick the work

Take the lowest-numbered unstarted item from `docs/ROADMAP.md`. Confirm its
feature IDs exist in `docs/FEATURES.md`. If the scope is ambiguous, stop and ask
rather than inventing requirements.

## 2. Branch

```
feat/<feature-id>-<slug>     feat/f01-manual-entry
fix/<slug>                   fix/tab-bar-inset
chore/<slug>                 chore/bump-expo
docs/<slug>                  docs/security-model
```

Branch from an up-to-date `main`. Never commit feature work directly to `main`.

## 3. Build, test first

TDD is required for anything in `src/lib` and `src/db`, and for every bug fix:

1. Commit the failing tests first (`test(<scope>): ...`).
2. Commit the implementation that makes them pass (`feat(<scope>): ...`).
3. Refactor with the tests green.

Both commits may be pushed together; CI only needs to be green on the branch
head. The test reviewer checks the order **before merge** (squash merge erases
it) by checking out the test commit and confirming the new tests fail there. UI work needs at least one E2E
(Playwright) spec for the happy path.

| Layer | Tool | Lives in | Covers |
| --- | --- | --- | --- |
| Unit | Jest | `src/**/__tests__` | Pure logic: money, dates, parsers, rules |
| Integration | Jest + real SQLite in Node | `src/db/__tests__` | Repositories and migrations against a real database, never a hand-written mock. `expo-sqlite`'s native module does not run under Jest, so PR 3 adds a thin adapter over `node:sqlite` (Node 24) that implements the subset of the `SQLiteDatabase` API the repositories use |
| E2E | Playwright (WebKit, iPhone viewport) | `e2e/` | User flows in the exported web build, including offline reload |

- Read `docs/ARCHITECTURE.md` and `docs/DESIGN.md` before writing UI.
- Reuse primitives from `src/components/ui` before creating new ones.
- Put pure logic in `src/lib` with tests.
- Put SQL in `src/db`, never in a screen.
- Update `docs/FEATURES.md` status and `docs/ROADMAP.md` checkboxes **in the
  same PR**.

Run before pushing:

```bash
npm run verify        # typecheck + lint + test
npx expo export --platform web --output-dir /tmp/paisa-web   # bundle smoke test
```

(Until PR 2 adds the web export and E2E jobs, CI still exports iOS.)

## 4. Commit

Conventional commits, imperative mood, scoped:

```
feat(transactions): add amount-first expense sheet

Stores amounts as integer paise and validates with parseAmountToPaise.
Refs F-01.
```

## 5. Open the PR

Use `.github/pull_request_template.md`. The description must state:

- Feature IDs implemented
- What changed and what deliberately did not
- How it was verified (commands + manual steps)
- Screenshots for any visual change (light and dark)

## 6. Review gate (required)

After the PR is open and CI has run, three review agents run **in parallel**.
None of them is the agent that wrote the code. Definitions live in
`.claude/agents/`:

| Agent | File | Checks |
| --- | --- | --- |
| Test reviewer | `.claude/agents/test-reviewer.md` | `npm run verify`, test-first commit order, unit + integration coverage of the changed logic, E2E for UI, edge cases (zero, max, negative, Unicode, leap day, IST midnight) |
| Security reviewer | `.claude/agents/security-reviewer.md` | Diff against `docs/SECURITY.md`: interpolated SQL, XSS sinks, PII in logs, new dependencies, `npm audit`, secrets, CSP/header changes |
| Pen tester | `.claude/agents/pen-tester.md` | Attacks what the PR adds: hostile files to every parser, script payloads in every text field, oversized inputs, response headers and CSP of the built app, service-worker scope |

Rules for all three:

1. Read the diff, `docs/ARCHITECTURE.md`, and `docs/SECURITY.md`.
2. Return one report each, in the format below. The orchestrating session posts
   each report as a PR comment (`gh pr comment <n> --body-file <report>`). The
   pen tester may include failing test cases as suggestions, not commits.
3. Never push commits to the branch — report only. The author fixes.
4. After fixes for any P0/P1, the agent that raised it re-checks before merge.

After merge, the security reviewer and pen tester run again against the
**preview** deploy of `main`. Production is deployed only when they report no
P0/P1 — a production deploy reaches the phone automatically through the service
worker, so the gate is the deploy, not the install. The test-first commit-order
check does not re-run after merge.

### Review comment format

```markdown
## Review — <PR title>

**Verdict:** APPROVE | APPROVE WITH NITS | CHANGES REQUIRED

### Blockers (P0/P1)
- [P1] `src/db/x.ts:42` — SQL built with template interpolation; use a parameter.

### Errors & correctness (P2)
- ...

### Security
- [x] No interpolated SQL
- [x] No XSS sinks (`dangerouslySetInnerHTML`, `eval`, `innerHTML`)
- [x] No PII in logs
- [x] No new runtime network access or third-party origin
- [x] Input validated at boundaries

### Tests
- [ ] Tests committed before implementation
- [ ] Unit / integration / E2E cover the change

### Design & accessibility
- [ ] Dark mode verified in the installed PWA
- [ ] 200% text zoom (Safari tab, **aA → 200%**; the home-screen app has no zoom control) verified
- [ ] Tokens used (no hex literals)

### Docs
- [ ] FEATURES.md updated
- [ ] ROADMAP.md updated

### Nits (P3)
- ...
```

### Severity

| Level | Meaning | Merge? |
| --- | --- | --- |
| P0 | Data loss, injection, XSS, secret leak, crash on launch | Never |
| P1 | Wrong money math, broken core flow, privilege issue | Never |
| P2 | Real bug in an edge case, missing test for logic | Fix or file a follow-up issue |
| P3 | Style, naming, docs wording | Author's discretion |

A PR with an open P0/P1 is not merged. No exceptions for "it works on my machine".

### Reviewer checklist

- Amounts are integers in paise; no float arithmetic on money
- `occurred_on` is a local `YYYY-MM-DD` string, not a derived UTC date
- Every new query is parameterised and indexed if it filters or sorts
- Loading, empty, and error states exist
- No `any`, no non-null `!` without a guard, no silent `catch {}`
- No `console.log` of user data
- New dependency justified in the PR description
- Tests cover the branch that is most likely to break
- `docs/FEATURES.md` reflects reality

## 7. Merge

Squash merge with the PR title as the subject. Delete the branch. `main` must
stay green: if CI fails after merge, fix forward immediately.

## 8. After merge

- Tick the roadmap item.
- If a decision was made that a future agent could get wrong, add it to
  `docs/ARCHITECTURE.md` (or the "Accepted risks" table in `SECURITY.md`).
- Keep this file short. If a rule needs a paragraph of justification, it belongs
  in `ARCHITECTURE.md`.
