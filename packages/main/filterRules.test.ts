import { describe, expect, it } from 'vitest';
import { FilterRuleIndex, matchesFilterRule, parseFilterLine, type NetworkFilterRule } from './filterRules';

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

describe('parseFilterLine options', () => {
  it('treats from= as initiator domains so site-scoped rules stay scoped', () => {
    const parsed = rule('$image,3p,denyallow=cdn77.org,from=pussyspace.com|example.org');
    expect(parsed.includedDomains).toEqual(['pussyspace.com', 'example.org']);
    expect(parsed.includedTypes).toContain('image');
    expect(parsed.party).toBe('third');
    expect(matchesFilterRule(parsed, 'https://relay.firefox.com/logo.svg', {
      resourceType: 'image',
      initiatorUrl: 'https://relay.firefox.com/',
    })).toBe(false);
    expect(matchesFilterRule(parsed, 'https://cdn.example.net/a.jpg', {
      resourceType: 'image',
      initiatorUrl: 'https://pussyspace.com/',
    })).toBe(true);
  });

  it('does not read options after from= as extra domains', () => {
    const parsed = rule('$image,from=pussyspace.com,3p');
    expect(parsed.includedDomains).toEqual(['pussyspace.com']);
    expect(parsed.party).toBe('third');
  });

  it('honours to= and denyallow= against the request host', () => {
    const parsed = rule('||ads.example^$image,to=ads.example|cdn.ads.example,denyallow=cdn.ads.example');
    expect(parsed.includedTargets).toEqual(['ads.example', 'cdn.ads.example']);
    expect(parsed.excludedTargets).toEqual(['cdn.ads.example']);
    expect(matchesFilterRule(parsed, 'https://ads.example/a.png', { resourceType: 'image' })).toBe(true);
    expect(matchesFilterRule(parsed, 'https://cdn.ads.example/a.png', { resourceType: 'image' })).toBe(false);
    expect(matchesFilterRule(parsed, 'https://other.test/a.png', { resourceType: 'image' })).toBe(false);
  });

  it('skips modifiers that are not plain network blocks', () => {
    expect(parseFilterLine('||example.com^$removeparam=utm')).toBeNull();
    expect(parseFilterLine('||example.com^$redirect=noop.js')).toBeNull();
    expect(parseFilterLine('||example.com^$csp=script-src none')).toBeNull();
    expect(parseFilterLine('||example.com^$popup')).toBeNull();
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
