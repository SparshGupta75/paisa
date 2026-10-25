## Summary

<!-- One paragraph: what changed and why. -->

**Feature IDs:** <!-- F-01, F-05 (see docs/FEATURES.md) -->
**Roadmap item:** <!-- PR N in docs/ROADMAP.md -->

## What changed

<!--
- Added ...
- Changed ...
-->

## Deliberately not included

<!-- Scope boundaries. Prevents "while I was here" review creep. -->

## Verification

- [ ] Tests committed before the implementation (TDD)
- [ ] `npm run verify` passes (unit + integration)
- [ ] E2E (Playwright) passes — from PR 2 onwards
- [ ] `npx expo export --platform web` succeeds (`ios` until PR 2)
- [ ] Tested in the installed home-screen app on iPhone (or Simulator Safari)
- [ ] Light mode
- [ ] Dark mode
- [ ] Cold start in Airplane Mode
- [ ] 200% text zoom (Safari tab, **aA → 200%**; the home-screen app has no zoom control)
- [ ] Empty state
- [ ] Error state

## Screenshots

<!-- Light and dark, for any visual change. -->

## Security checklist (docs/SECURITY.md)

- [ ] No interpolated SQL — all queries parameterised
- [ ] No XSS sinks (`dangerouslySetInnerHTML`, `innerHTML`, `eval`)
- [ ] No new network calls, telemetry, or third-party origins
- [ ] No PII (amounts, notes, merchants) in logs
- [ ] User input validated at the boundary; size caps enforced
- [ ] Each new dependency justified below
- [ ] Destructive action confirmed with the shared confirmation sheet

**New dependencies and why:**

## Docs

- [ ] `docs/FEATURES.md` status updated
- [ ] `docs/ROADMAP.md` updated
- [ ] Architecture/security decision recorded (if one was made)

## Review agents

- [ ] Test reviewer — verdict:
- [ ] Security reviewer — verdict:
- [ ] Pen tester — verdict:

## Reviewer notes

<!-- Anything you are unsure about, or want a second opinion on. -->
