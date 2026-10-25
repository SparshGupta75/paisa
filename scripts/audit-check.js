#!/usr/bin/env node
/**
 * Fails CI on any high/critical npm advisory that is not an accepted risk in
 * docs/SECURITY.md#accepted-risks. Usage: npm audit --json | node scripts/audit-check.js
 */

// Build-time tooling only; none of these ship in the web bundle. Keep in sync
// with the accepted-risks table, and re-check on every Expo upgrade.
const ACCEPTED = ['@expo/cli', '@expo/code-signing-certificates', 'expo', 'node-forge', 'zod'];

const BLOCKING = new Set(['high', 'critical']);

function findUnaccepted(report) {
  return Object.values(report?.vulnerabilities ?? {})
    .filter((vuln) => BLOCKING.has(vuln.severity) && !ACCEPTED.includes(vuln.name))
    .map((vuln) => vuln.name)
    .sort();
}

if (require.main === module) {
  let input = '';
  process.stdin.on('data', (chunk) => (input += chunk));
  process.stdin.on('end', () => {
    const unaccepted = findUnaccepted(JSON.parse(input || '{}'));
    if (unaccepted.length > 0) {
      console.error(`Unaccepted high/critical advisories: ${unaccepted.join(', ')}`);
      console.error('Fix them, or record a reviewed exception in docs/SECURITY.md and scripts/audit-check.js.');
      process.exit(1);
    }
    console.info('No unaccepted high/critical advisories.');
  });
}

module.exports = { ACCEPTED, findUnaccepted };
