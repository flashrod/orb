import { describe, expect, it } from 'vitest';
import { isTrackingParam, stripTrackingParams } from './privacy';

describe('isTrackingParam', () => {
  it('recognizes utm parameters and common click ids', () => {
    expect(isTrackingParam('utm_source')).toBe(true);
    expect(isTrackingParam('UTM_Campaign')).toBe(true);
    expect(isTrackingParam('fbclid')).toBe(true);
    expect(isTrackingParam('gclid')).toBe(true);
    expect(isTrackingParam('msclkid')).toBe(true);
  });

  it('leaves ordinary parameters alone', () => {
    expect(isTrackingParam('id')).toBe(false);
    expect(isTrackingParam('q')).toBe(false);
    expect(isTrackingParam('page')).toBe(false);
  });
});

describe('stripTrackingParams', () => {
  it('removes tracking parameters but keeps the rest of the query', () => {
    expect(stripTrackingParams('https://example.com/article?utm_source=news&id=42&fbclid=abc')).toBe(
      'https://example.com/article?id=42',
    );
  });

  it('removes every tracking parameter and keeps the hash', () => {
    expect(stripTrackingParams('https://example.com/?utm_medium=a&gclid=b&q=orb#section')).toBe(
      'https://example.com/?q=orb#section',
    );
  });

  it('returns clean URLs unchanged', () => {
    const clean = 'https://example.com/a?b=1#c';
    expect(stripTrackingParams(clean)).toBe(clean);
  });

  it('ignores non-web schemes', () => {
    expect(stripTrackingParams('mailto:hi@example.com?utm_source=x')).toBe('mailto:hi@example.com?utm_source=x');
    expect(stripTrackingParams('about:blank')).toBe('about:blank');
  });

  it('returns malformed input unchanged', () => {
    expect(stripTrackingParams('not a url')).toBe('not a url');
  });

  it('does not treat parameter values as tracking names', () => {
    expect(stripTrackingParams('https://example.com/?next=utm_source')).toBe('https://example.com/?next=utm_source');
  });
});
