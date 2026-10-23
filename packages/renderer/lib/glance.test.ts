import { describe, expect, it } from 'vitest';
import { normalizeGlanceUrl } from './glance';

describe('Glance links', () => {
  it('accepts only HTTP and HTTPS URLs', () => {
    expect(normalizeGlanceUrl('https://example.com/article')).toBe('https://example.com/article');
    expect(normalizeGlanceUrl('http://example.com')).toBe('http://example.com/');
    expect(normalizeGlanceUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeGlanceUrl('file:///etc/passwd')).toBeNull();
    expect(normalizeGlanceUrl('not a url')).toBeNull();
  });
});
