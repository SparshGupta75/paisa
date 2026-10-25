// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ACCEPTED, findUnaccepted } = require('../audit-check');

const audit = (vulns: Record<string, { severity: string; via?: unknown[] }>) => ({
  vulnerabilities: Object.fromEntries(
    Object.entries(vulns).map(([name, v]) => [name, { name, via: [], ...v }]),
  ),
});

describe('findUnaccepted', () => {
  it('passes when every high advisory is on the accepted-risks list', () => {
    const report = audit(Object.fromEntries(ACCEPTED.map((name: string) => [name, { severity: 'high' }])));
    expect(findUnaccepted(report)).toEqual([]);
  });

  it('flags a new high or critical advisory', () => {
    const report = audit({ zod: { severity: 'high' }, 'left-pad': { severity: 'critical' }, ms: { severity: 'high' } });
    expect(findUnaccepted(report)).toEqual(['left-pad', 'ms']);
  });

  it('ignores moderate and low advisories', () => {
    expect(findUnaccepted(audit({ ms: { severity: 'moderate' }, qs: { severity: 'low' } }))).toEqual([]);
  });

  it('treats a missing or empty report as clean', () => {
    expect(findUnaccepted({})).toEqual([]);
  });
});
