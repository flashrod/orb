import { describe, expect, it } from 'vitest';
import { decideFilterAction, matchesFilterRule, parseFilterLine } from '../../main/filterRules';

describe('ABP network filters', () => {
  it('matches a domain anchor on the host boundary and not a lookalike', () => {
    const rule = parseFilterLine('||tracker.example^');
    expect(rule).not.toBeNull();
    expect(matchesFilterRule(rule!, 'https://sub.tracker.example/pixel', { resourceType: 'image' })).toBe(true);
    expect(matchesFilterRule(rule!, 'https://nottracker.example/pixel', { resourceType: 'image' })).toBe(false);
  });

  it('honors resource types and excluded types', () => {
    const rule = parseFilterLine('||cdn.example^$script,~image');
    expect(matchesFilterRule(rule!, 'https://cdn.example/a.js', { resourceType: 'script' })).toBe(true);
    expect(matchesFilterRule(rule!, 'https://cdn.example/a.png', { resourceType: 'image' })).toBe(false);
    expect(matchesFilterRule(rule!, 'https://cdn.example/a.css', { resourceType: 'stylesheet' })).toBe(false);
  });

  it('parses domain option lists without treating the second domain as a type option', () => {
    const rule = parseFilterLine('||ads.example^$script,domain=shop.example,~news.example');
    expect(rule?.includedDomains).toEqual(['shop.example']);
    expect(rule?.excludedDomains).toEqual(['news.example']);
    expect(matchesFilterRule(rule!, 'https://ads.example/ad.js', { resourceType: 'script', initiatorUrl: 'https://shop.example' })).toBe(true);
    expect(matchesFilterRule(rule!, 'https://ads.example/ad.js', { resourceType: 'script', initiatorUrl: 'https://news.example' })).toBe(false);
  });

  it('supports allow rules and first-party/third-party options', () => {
    const allow = parseFilterLine('@@||ads.example^$image');
    expect(allow?.action).toBe('allow');
    expect(matchesFilterRule(allow!, 'https://ads.example/a.png', { resourceType: 'image' })).toBe(true);
    const thirdParty = parseFilterLine('||ads.example^$third-party');
    expect(matchesFilterRule(thirdParty!, 'https://ads.example/a.js', { resourceType: 'script', initiatorUrl: 'https://shop.example' })).toBe(true);
    expect(matchesFilterRule(thirdParty!, 'https://ads.example/a.js', { resourceType: 'script', initiatorUrl: 'https://shop.example' , sameSite: true})).toBe(false);
  });

  it('lets a matching allow rule override matching block rules', () => {
    const block = parseFilterLine('||ads.example^$image')!;
    const allow = parseFilterLine('@@||ads.example^$image,domain=shop.example')!;
    expect(decideFilterAction([block, allow], 'https://ads.example/a.png', { resourceType: 'image', initiatorUrl: 'https://shop.example' })).toBe('allow');
    expect(decideFilterAction([block, allow], 'https://ads.example/a.png', { resourceType: 'image', initiatorUrl: 'https://other.example' })).toBe('block');
  });
});

describe('privacy request context', () => {
  it('uses the public suffix list to distinguish same-site and third-party requests', async () => {
    const { isThirdPartyRequest } = await import('../../main/filterRules');
    expect(isThirdPartyRequest('https://cdn.example.co.uk/a.js', 'https://www.example.co.uk')).toBe(false);
    expect(isThirdPartyRequest('https://tracker.co.uk/a.js', 'https://www.example.co.uk')).toBe(true);
    expect(isThirdPartyRequest('https://tracker.example/a.js', '')).toBe(false);
  });
});
