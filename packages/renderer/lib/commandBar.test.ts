import { describe, expect, it } from 'vitest';
import { shouldDedupByHost } from './commandBar';

describe('command bar tab dedup', () => {
  it('dedups only hosts where duplicate tabs are noise', () => {
    expect(shouldDedupByHost('figma.com')).toBe(true);
    expect(shouldDedupByHost('www.figma.com')).toBe(true);
    expect(shouldDedupByHost('notion.so')).toBe(true);
    expect(shouldDedupByHost('app.notion.com')).toBe(true);
    expect(shouldDedupByHost('maps.google.com')).toBe(true);
    expect(shouldDedupByHost('github.com')).toBe(true);
    expect(shouldDedupByHost('zoom.us')).toBe(true);
  });

  it('keeps multiple tabs from other hosts', () => {
    expect(shouldDedupByHost('docs.google.com')).toBe(false);
    expect(shouldDedupByHost('example.com')).toBe(false);
    expect(shouldDedupByHost('news.ycombinator.com')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(shouldDedupByHost('FIGMA.COM')).toBe(true);
    expect(shouldDedupByHost('WWW.FIGMA.COM')).toBe(true);
  });
});
