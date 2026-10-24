import { describe, expect, it } from 'vitest';
import { FilterRuleIndex, parseFilterLine, type NetworkFilterRule } from './filterRules';

function rule(line: string): NetworkFilterRule {
  const parsed = parseFilterLine(line);
  if (!parsed) throw new Error(`Could not parse: ${line}`);
  return parsed;
}

const request = { resourceType: 'script' as const };

describe('parseFilterLine', () => {
  it('records the domain anchor of a || rule', () => {
    expect(rule('||ads.example.com^').domainAnchor).toBe('ads.example.com');
  });
});

describe('FilterRuleIndex', () => {
  it('blocks an anchored rule for that domain', () => {
    const index = new FilterRuleIndex([rule('||ads.example.com^')]);
    expect(index.decide('https://ads.example.com/banner.js', request)).toBe('block');
  });

  it('does not match lookalike domains', () => {
    const index = new FilterRuleIndex([rule('||ads.example.com^')]);
    expect(index.decide('https://notads.example.com/banner.js', request)).toBe('none');
  });

  it('matches parent anchors for subdomains', () => {
    const index = new FilterRuleIndex([rule('||example.com^')]);
    expect(index.decide('https://cdn.example.com/app.js', request)).toBe('block');
  });

  it('evaluates generic rules for every host', () => {
    const index = new FilterRuleIndex([rule('/banner/*/ad.js')]);
    expect(index.decide('https://anything.test/banner/x/ad.js', request)).toBe('block');
    expect(index.decide('https://anything.test/banner/x/app.js', request)).toBe('none');
  });

  it('lets allow rules override blocks', () => {
    const index = new FilterRuleIndex([rule('||ads.example.com^'), rule('@@||ads.example.com/ok.js')]);
    expect(index.decide('https://ads.example.com/ok.js', request)).toBe('allow');
    expect(index.decide('https://ads.example.com/bad.js', request)).toBe('block');
  });

  it('keeps unrelated domain rules out of the candidate set', () => {
    const index = new FilterRuleIndex([rule('||ads.example.com^'), rule('||tracker.test^')]);
    expect(index.candidates('https://unrelated.test/app.js')).toHaveLength(0);
    expect(index.candidates('https://cdn.ads.example.com/app.js')).toHaveLength(1);
  });

  it('respects initiator domain options', () => {
    const index = new FilterRuleIndex([rule('||ads.example.com^$domain=site.com')]);
    expect(index.decide('https://ads.example.com/a.js', { resourceType: 'script', initiatorUrl: 'https://site.com/' })).toBe('block');
    expect(index.decide('https://ads.example.com/a.js', { resourceType: 'script', initiatorUrl: 'https://other.com/' })).toBe('none');
  });

  it('reports the first blocking rule for the blocked-request log', () => {
    const index = new FilterRuleIndex([rule('||ads.example.com^')]);
    expect(index.firstBlockMatch('https://ads.example.com/a.js', request)?.source).toBe('||ads.example.com^');
    expect(index.firstBlockMatch('https://other.test/a.js', request)).toBeUndefined();
  });
});
