# Security & privacy

Paisa holds someone's full spending history. Treat every row as sensitive.

## Threat model

| Threat | Likelihood | Impact | Control |
| --- | --- | --- | --- |
| Someone picks up the unlocked phone | High | High | Face ID gate (PR 10) |
| Device backup / forensic extraction | Medium | High | SQLCipher encryption (PR 10, dev build) |
| Malicious CSV or statement file | Medium | Medium | Strict parsing, no formula evaluation, no `eval` |
| SQL injection through user input | Low | High | Parameterised statements only |
| Supply-chain compromise in a dependency | Medium | High | Minimal dependency surface, pinned lockfile, review |
| Data leaking through logs / crash reports | Medium | High | No analytics, no crash SDK, no PII in logs |
| Clipboard leakage of exported data | Low | Medium | Explicit export with a visible destination choice |

## Data classification

| Data | Sensitivity | Where it lives |
| --- | --- | --- |
| Amounts, dates, notes | Confidential | Local SQLite |
| Account names / last-4 | Confidential | Local SQLite |
| Receipt images | Confidential | Local app container (PR 11) |
| Merchant names | Confidential | Local SQLite |

Nothing is transmitted. There is no server, no account, and no telemetry.

## Rules

1. **No SQL string interpolation.** Use `runAsync(sql, params)`,
   `getAllAsync(sql, params)`, or `db.sql` tagged templates. `execAsync` is for
   static DDL only. The single intentional exception is
   `PRAGMA user_version = ${n}` in `src/db/migrate.ts`, where `n` is an
   integer-validated literal from our own code.
2. **No secrets in the repo.** No API keys, no signing material. `.env*` is
   gitignored.
3. **No telemetry.** Adding any SDK that phones home requires a docs update and
   an explicit product decision — it is currently a non-goal.
4. **No PII in logs.** Log ids, never amounts, notes, or merchant names. Remove
   debug logging before merging.
5. **Validate at the boundary.** Parsers return `null`/`Result`, never throw on
   bad user input. Cap sizes: reject amounts over `MAX_AMOUNT_PAISE`, notes over
   1,000 characters, imports over 50 MB.
6. **Escaping on export.** CSV cells beginning with `=`, `+`, `-`, `@`, tab, or
   carriage return are prefixed with `'` to prevent spreadsheet formula
   injection (PR 8).
7. **Least privilege.** Request camera/photos/biometrics only at the moment of
   use, with a clear purpose string in `app.json`.
8. **Destructive actions are reversible or confirmed.** Deletes use a native
   confirmation and are soft-deleted where practical.

## Accepted risks

Tracked consciously. Re-evaluate each time the dependency is upgraded.

| Finding | Advisory | Why accepted | Mitigation |
| --- | --- | --- | --- |
| `zod` < 4.6.6 (high) | GHSA-mrhx-c7xc-m3w5 | Transitive dependency of Expo CLI tooling; not shipped in the app bundle | Build-time only; fixed upstream when Expo bumps it. Do **not** run `npm audit fix --force`, it downgrades Expo to 44. |
| `node-forge` via `@expo/code-signing-certificates` (high) | — | Used by EAS/CLI signing tooling, never at runtime | Build-time only |
| `@expo/cli` transitive advisories (high) | — | Local dev server and build tooling | Not in the app bundle; keep CLI updated with Expo SDK |

Verification: `npm ls zod node-forge` shows they resolve only under
`node_modules/expo/node_modules/@expo/cli`. If a high-severity advisory ever
lands in a package that is bundled into the app, it is a **P0** — stop and fix.

## Dependency policy

- Prefer Expo modules over third-party packages.
- Every new runtime dependency needs a one-line justification in the PR.
- Pin with the lockfile; CI uses `npm ci`.
- No package with a postinstall script unless reviewed.
- Prefer libraries with a single maintainer *only* when they are the de-facto
  standard (e.g. `@react-native-community/datetimepicker`).

## Before shipping to real users

- [ ] SQLCipher enabled and verified with `PRAGMA cipher_version`
- [ ] Face ID gate on cold start and on resume after 60 s
- [ ] Screenshot redaction in the app switcher
- [ ] Export produces a file, not a clipboard dump
- [ ] Backup exclusion for receipt images if they are re-downloadable

## Reporting

This is a personal project. Security issues: open a private advisory on the
GitHub repo rather than a public issue.
