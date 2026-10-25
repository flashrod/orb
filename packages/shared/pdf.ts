/** Turns a page title into a safe, portable PDF filename. */
export function pdfFilename(title: string, url: string): string {
  const fallback = (() => {
    try {
      return new URL(url).hostname || 'page';
    } catch {
      return 'page';
    }
  })();

  const base = (title || fallback)
    .replace(/[\u0000-\u001f<>:"/\\|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, 116)
    .trim();

  const name = base || fallback;
  return /\.pdf$/i.test(name) ? name : `${name}.pdf`;
}
