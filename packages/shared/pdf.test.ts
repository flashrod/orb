import { describe, expect, it } from 'vitest';
import { pdfFilename } from './pdf';

describe('PDF filename', () => {
  it('uses the page title', () => {
    expect(pdfFilename('Electron (software) - Wikipedia', 'https://en.wikipedia.org/wiki/Electron'))
      .toBe('Electron (software) - Wikipedia.pdf');
  });

  it('falls back to the hostname when the title is empty', () => {
    expect(pdfFilename('', 'https://example.com/some/page')).toBe('example.com.pdf');
    expect(pdfFilename('   ', 'not a url')).toBe('page.pdf');
  });

  it('removes path separators and reserved characters', () => {
    expect(pdfFilename('a/b:c*?  d', 'https://example.com')).toBe('a b c d.pdf');
  });

  it('does not duplicate the extension', () => {
    expect(pdfFilename('report.pdf', 'https://example.com')).toBe('report.pdf');
    expect(pdfFilename('REPORT.PDF', 'https://example.com')).toBe('REPORT.PDF');
  });

  it('keeps names within a safe length', () => {
    const name = pdfFilename('x'.repeat(300), 'https://example.com');
    expect(name.length).toBeLessThanOrEqual(120);
    expect(name.endsWith('.pdf')).toBe(true);
  });
});
