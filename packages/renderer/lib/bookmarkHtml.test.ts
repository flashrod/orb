import { describe, expect, it } from 'vitest';
import { exportBookmarkHtml } from './bookmarkHtml';

describe('bookmark HTML export', () => {
  it('preserves nested folders and safely escapes bookmark data', () => {
    const html = exportBookmarkHtml([
      { id: 'root', title: 'Work & study', url: '', parentId: null, kind: 'folder' },
      { id: 'nested', title: 'Research', url: '', parentId: 'root', kind: 'folder' },
      { id: 'page', title: '<Docs>', url: 'https://example.com/?a=1&b=2', parentId: 'nested', kind: 'bookmark' },
    ]);
    expect(html).toContain('<H3>Work &amp; study</H3>');
    expect(html).toContain('<H3>Research</H3>');
    expect(html).toContain('HREF="https://example.com/?a=1&amp;b=2"');
    expect(html).toContain('&lt;Docs&gt;');
  });
});
