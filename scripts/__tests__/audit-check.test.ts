// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ACCEPTED_ADVISORIES, findUnaccepted } = require('../audit-check');

const advisory = (url: string, severity = 'high', name = 'pkg') => ({ source: 1, name, severity, url, title: 't' });

/** Shape of `npm audit --json`: advisories live in `via`; strings are transitive. */
const report = (vulns: Record<string, { severity: string; via: unknown[] }>) => {
  const counts = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 };
  for (const v of Object.values(vulns)) {
    counts[v.severity as keyof typeof counts] += 1;
    counts.total += 1;
  }
  return {
    vulnerabilities: Object.fromEntries(Object.entries(vulns).map(([name, v]) => [name, { name, ...v }])),
    metadata: { vulnerabilities: counts },
  };
};

describe('findUnaccepted', () => {
  it('passes when every high advisory is an accepted one, including packages that only depend on it', () => {
    const [first, second] = ACCEPTED_ADVISORIES;
    const result = findUnaccepted(
      report({
        zod: { severity: 'high', via: [advisory(first, 'high', 'zod')] },
        'node-forge': { severity: 'high', via: [advisory(second, 'high', 'node-forge')] },
        expo: { severity: 'high', via: ['@expo/cli'] },
      }),
    );
    expect(result).toEqual([]);
  });

  it('flags a new advisory even on a package that already has an accepted one', () => {
    const result = findUnaccepted(
      report({
        expo: { severity: 'critical', via: [advisory('https://github.com/advisories/GHSA-new1-new1-new1', 'critical', 'expo')] },
        zod: {
          severity: 'high',
          via: [advisory(ACCEPTED_ADVISORIES[0]), advisory('https://github.com/advisories/GHSA-new2-new2-new2')],
        },
      }),
    );
    expect(result).toEqual([
      'https://github.com/advisories/GHSA-new1-new1-new1',
      'https://github.com/advisories/GHSA-new2-new2-new2',
    ]);
  });

  it('ignores moderate and low advisories', () => {
    const result = findUnaccepted(
      report({ ms: { severity: 'moderate', via: [advisory('https://github.com/advisories/GHSA-mod', 'moderate')] } }),
    );
    expect(result).toEqual([]);
  });

  it('passes a clean report', () => {
    expect(findUnaccepted(report({}))).toEqual([]);
  });

  it('fails closed when npm audit could not produce a report', () => {
    expect(findUnaccepted({})).toEqual(['invalid npm audit report']);
    expect(findUnaccepted({ error: { code: 'ENOTFOUND' } })).toEqual(['invalid npm audit report']);
    expect(findUnaccepted(null)).toEqual(['invalid npm audit report']);
  });
});
