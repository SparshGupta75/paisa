# Security & privacy

Paisa holds someone's full spending history. Treat every row as sensitive.

## Threat model

Paisa is a static web app installed to the iPhone home screen. All data lives in
SQLite (OPFS) inside that app's storage. The host serves code, never data.

| Threat | Likelihood | Impact | Control |
| --- | --- | --- | --- |
| Someone picks up the unlocked phone | High | High | Passkey app lock + blur on background (PR 13) |
| Device backup / forensic extraction | Medium | High | iOS data protection only; the app does not encrypt (accepted risk below) |
| XSS — script injected through a note, merchant string, or imported file | Medium | **Critical** (full data access) | React text rendering only, no `dangerouslySetInnerHTML`, strict CSP, no `eval` |
| Malicious statement / backup / CSV file | Medium | Medium | Strict parsers, size caps, no formula evaluation, dry-run before write |
| Compromised host or deploy pipeline ships malicious code | Low | **Critical** | Deploy only from CI on `main`, review agents pass on the preview deploy before promotion to production, host account with 2FA, pinned lockfile, SRI not needed (no third-party origins) |
| Stale or poisoned service-worker cache | Low | Medium | Versioned precache (only 2xx same-origin responses), "Update" banner when a new version is waiting, `registration.update()` on every return to the foreground, SW served with `Cache-Control: no-cache` |
| Clickjacking / embedding | Low | Medium | `frame-ancestors 'none'` in CSP |
| SQL injection through user input | Low | High | Parameterised statements only |
| Supply-chain compromise in a dependency | Medium | High | Minimal dependency surface, pinned lockfile, review, audit in CI |
| Data leaking through logs / crash reports | Medium | High | No analytics, no crash SDK, no PII in logs |
| Losing the origin: domain lapses or a shared-host subdomain is taken over | Low | **Critical** (new owner's code reads all data) | One permanent custom domain, auto-renew, registrar lock, 2FA. Never move origins: OPFS data and passkeys are bound to the exact origin, so moving orphans all data |
| Offline launch serves a cached page with stale headers/CSP | Medium | Medium | Header fixes only apply after the service worker updates; E2E checks `crossOriginIsolated` on an offline cold start |
| Backup file read from iCloud Drive or a shared device | Medium | High | Backups are plaintext JSON in v1; label the file clearly, and consider an optional passphrase (WebCrypto AES-GCM) in PR 4 |
| Data loss (home-screen icon removed, storage evicted) | Medium | High | `navigator.storage.persist()`, backup reminders, export/restore (PR 4) |

## Data classification

| Data | Sensitivity | Where it lives |
| --- | --- | --- |
| Amounts, dates, notes | Confidential | SQLite in the PWA's OPFS storage |
| Account names / last-4 | Confidential | SQLite in the PWA's OPFS storage |
| Merchant names, raw UPI strings | Confidential | SQLite in the PWA's OPFS storage |
| Imported statement files | Confidential | Read in memory, never stored as files |
| Backup files | Confidential | Wherever the user saves them (Files / iCloud Drive) |

Nothing is transmitted. There is no API, no account, and no telemetry. After the
first load the app makes no network requests except service-worker update checks
to its own origin.

## Required response headers

Defined once in `scripts/web/headers.js`, applied by the dev server, the E2E server, and the host's `_headers` for **every path** (`/*`, including `.wasm`, `/_expo/*`, and `sw.js`) and verified by the pen-test agent on every deploy:

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'` (`blob:` is required: Metro wraps the SQLite worker in a blob URL when the page is cross-origin isolated. Keep `'unsafe-inline'` for styles or replace it with a hash of Expo's inline `expo-reset` style. `'wasm-unsafe-eval'` is why iOS 16 is the minimum — see ARCHITECTURE.md stack table) |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Embedder-Policy` | `require-corp` (Safari is not known to support `credentialless`; Paisa loads no third-party resources, so `require-corp` costs nothing) |
| `Cross-Origin-Resource-Policy` | `same-origin` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `no-referrer` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` |

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
   injection (PR 4).
7. **Least privilege.** No permission prompts at launch. Passkey registration
   happens only when the user turns on the app lock.
8. **Destructive actions are reversible or confirmed.** Deletes use the shared
   confirmation sheet and are soft-deleted where practical.
9. **No HTML from data.** Never `dangerouslySetInnerHTML`, `innerHTML`, `eval`,
   `new Function`, or `javascript:` URLs. Imported text is rendered as text.
10. **No third-party origins.** Every script, font, icon, and WASM file is
    self-hosted from the app's origin. No CDNs.
11. **Backups are plain JSON, validated on restore** against a schema and size
    cap before anything is written. Restore never executes or evaluates content.

## Accepted risks

Tracked consciously. Re-evaluate each time the dependency is upgraded.

| Finding | Advisory | Why accepted | Mitigation |
| --- | --- | --- | --- |
| `zod` < 4.6.6 (high) | GHSA-mrhx-c7xc-m3w5 | Transitive dependency of Expo CLI tooling; not shipped in the app bundle | Build-time only; fixed upstream when Expo bumps it. Do **not** run `npm audit fix --force`, it downgrades Expo to 44. |
| `node-forge` via `@expo/code-signing-certificates` (high) | — | Used by EAS/CLI signing tooling, never at runtime | Build-time only |
| `@expo/cli` transitive advisories (high) | — | Local dev server and build tooling | Not in the app bundle; keep CLI updated with Expo SDK |
| `eval('require')` in the bundle (from `uuid`) | — | Node-only branch, never reached in the browser; not affected by CSP because it never runs | Do not report as an XSS sink |
| `eval(body)` in the bundle (`expo/build/async-require/fetchThenEvalJs.js`) | — | Fallback loader for split bundles; in the browser they load through `<script>` tags. CSP (`script-src` without `'unsafe-eval'`) blocks it if ever reached | Do not report as an XSS sink |
| Database not encrypted by the app | — | SQLCipher is unavailable on the web; a passphrase-derived key would add a prompt on every open; deferred for v1 | iOS data protection while locked; app lock (PR 13); research WebAuthn PRF-derived key later |

Verification: `npm ls zod node-forge` shows them under Expo's CLI tooling (and
`zod` also under the dev-only `eslint-plugin-react-hooks`); neither appears in
`dist/`. CI enforces this table: `scripts/audit-check.js` fails the build on any
high/critical advisory whose package is not listed in its `ACCEPTED` array, so a
new exception needs a row here **and** an entry there. If a high-severity
advisory ever lands in a package that is bundled into the app, it is a **P0** —
stop and fix.

## Dependency policy

- Prefer Expo modules over third-party packages.
- Every new runtime dependency needs a one-line justification in the PR.
- Pin with the lockfile; CI uses `npm ci`.
- No package with a postinstall script unless reviewed.
- Prefer libraries with a single maintainer *only* when they are the de-facto
  standard and work on the web (check `react-native-web` support before adding
  any React Native library).

## Before shipping to real users

- [ ] All required response headers present (pen-test agent check)
- [ ] `crossOriginIsolated` true in the installed app on iPhone
- [ ] App lock on cold start and on resume after 60 s
- [ ] UI blurred when the app goes to the background
- [ ] Export produces a file, not a clipboard dump
- [ ] Onboarding warns that removing the home-screen app deletes data

## Reporting

This is a personal project. Security issues: open a private advisory on the
GitHub repo rather than a public issue.
