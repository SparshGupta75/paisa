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

- [ ] `npm run verify` passes
- [ ] `npx expo export --platform ios` succeeds
- [ ] Manually tested on iOS Simulator
- [ ] Light mode
- [ ] Dark mode
- [ ] Dynamic Type XL
- [ ] Empty state
- [ ] Error state

## Screenshots

<!-- Light and dark, for any visual change. -->

## Security checklist (docs/SECURITY.md)

- [ ] No interpolated SQL — all queries parameterised
- [ ] No new network calls or telemetry
- [ ] No PII (amounts, notes, merchants) in logs
- [ ] User input validated at the boundary; size caps enforced
- [ ] Each new dependency justified below
- [ ] Destructive action confirmed with a native alert

**New dependencies and why:**

## Docs

- [ ] `docs/FEATURES.md` status updated
- [ ] `docs/ROADMAP.md` updated
- [ ] Architecture/security decision recorded (if one was made)

## Reviewer notes

<!-- Anything you are unsure about, or want a second opinion on. -->
