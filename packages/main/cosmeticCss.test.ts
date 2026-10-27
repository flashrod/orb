import { describe, expect, it } from 'vitest';
import { cosmeticCssForHost, type CosmeticRule } from './cosmeticCss';

const rule = (selector: string, domain?: string): CosmeticRule => ({ selector, domain, isRegexSelect: false });

describe('cosmeticCssForHost', () => {
  it('emits global rules for every host', () => {
    expect(cosmeticCssForHost([rule('.ad')], 'example.com')).toBe('.ad{display:none!important}');
  });

  it('only emits rules for the matching domain and its subdomains', () => {
    const rules = [rule('.yt-ad', 'youtube.com'), rule('.other', 'example.com')];
    expect(cosmeticCssForHost(rules, 'www.youtube.com')).toBe('.yt-ad{display:none!important}');
    expect(cosmeticCssForHost(rules, 'music.youtube.com')).toBe('.yt-ad{display:none!important}');
    expect(cosmeticCssForHost(rules, 'notyoutube.com')).toBe('');
  });

  it('does not let a lookalike suffix through', () => {
    expect(cosmeticCssForHost([rule('.ad', 'youtube.com')], 'youtube.com.evil.test')).toBe('');
  });

  it('honours domain lists and ~ exclusions', () => {
    const rules = [rule('.ad', 'a.test,b.test'), rule('.keep', 'a.test,~mail.a.test')];
    expect(cosmeticCssForHost(rules, 'a.test')).toBe('.ad,\n.keep{display:none!important}');
    expect(cosmeticCssForHost(rules, 'mail.a.test')).toBe('.ad{display:none!important}');
  });

  it('skips regex selectors, which are not plain CSS', () => {
    expect(cosmeticCssForHost([{ selector: '/ad/', domain: 'a.test', isRegexSelect: true }], 'a.test')).toBe('');
  });

  it('returns nothing for an empty host', () => {
    expect(cosmeticCssForHost([rule('.ad')], '')).toBe('');
  });
});
