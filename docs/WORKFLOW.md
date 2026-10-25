# Engineering workflow

One feature per pull request. Every PR is reviewed by a second agent for
correctness and security before merge. This file is the contract; follow it
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

## 3. Build

- Read `docs/ARCHITECTURE.md` and `docs/DESIGN.md` before writing UI.
- Reuse primitives from `src/components/ui` before creating new ones.
- Put pure logic in `src/lib` with tests.
- Put SQL in `src/db`, never in a screen.
- Update `docs/FEATURES.md` status and `docs/ROADMAP.md` checkboxes **in the
  same PR**.

Run before pushing:

```bash
npm run verify        # typecheck + lint + test
npx expo export --platform ios --output-dir /tmp/paisa-export   # bundle smoke test
```

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

A **second agent** reviews every PR before merge. The reviewing agent must:

1. Read the diff, `docs/ARCHITECTURE.md`, and `docs/SECURITY.md`.
2. Post a single PR comment using the format below.
3. Never push commits to the branch — report only. The author fixes.

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
- [x] No PII in logs
- [x] No new runtime network access
- [x] Input validated at boundaries

### Design & accessibility
- [ ] Dark mode verified
- [ ] Dynamic Type XL verified
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
| P0 | Data loss, injection, secret leak, crash on launch | Never |
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
