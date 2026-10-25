#!/usr/bin/env node
/**
 * Fails CI on any high/critical npm advisory that is not an accepted risk in
 * docs/SECURITY.md#accepted-risks. Usage: npm audit --json | node scripts/audit-check.js
 */

// Reviewed advisories, by URL. Both sit in Expo's build-time tooling and never
// ship in the web bundle; packages that are flagged only because they depend on
// these (expo, @expo/cli, @expo/code-signing-certificates) need no entry. Keep
// in sync with docs/SECURITY.md#accepted-risks, and re-check on every Expo upgrade.
const ACCEPTED_ADVISORIES = [
  'https://github.com/advisories/GHSA-mrhx-c7xc-m3w5', // zod
  'https://github.com/advisories/GHSA-86w9-cpqp-85rv', // node-forge
];

const BLOCKING = new Set(['high', 'critical']);
const INVALID = 'invalid npm audit report';

/** Advisory URLs at high/critical that are not accepted. Fails closed on a bad report. */
function findUnaccepted(report) {
  // `npm audit` prints {"error": ...} (or nothing) when it cannot reach the
  // registry; treat anything without a summary as a failure, never as clean.
  if (!report || typeof report.metadata?.vulnerabilities !== 'object' || !report.vulnerabilities) {
    return [INVALID];
  }
  const unaccepted = new Set();
  for (const vuln of Object.values(report.vulnerabilities)) {
    for (const via of vuln.via ?? []) {
      // Strings name another vulnerable package; its advisory is listed there.
      if (typeof via !== 'object' || !BLOCKING.has(via.severity)) continue;
      if (!ACCEPTED_ADVISORIES.includes(via.url)) unaccepted.add(via.url ?? `${via.name}: ${via.title}`);
    }
  }
  return [...unaccepted].sort();
}

if (require.main === module) {
  let input = '';
  process.stdin.on('data', (chunk) => (input += chunk));
  process.stdin.on('end', () => {
    let report = null;
    try {
      report = JSON.parse(input);
    } catch {
      // Falls through to the invalid-report failure below.
    }
    const unaccepted = findUnaccepted(report);
    if (unaccepted.length > 0) {
      console.error(`Unaccepted high/critical advisories:\n  ${unaccepted.join('\n  ')}`);
      console.error('Fix them, or record a reviewed exception in docs/SECURITY.md and scripts/audit-check.js.');
      process.exit(1);
    }
    console.info('No unaccepted high/critical advisories.');
  });
}

module.exports = { ACCEPTED_ADVISORIES, findUnaccepted };
