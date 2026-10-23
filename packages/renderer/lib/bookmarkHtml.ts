import type { BookmarkImportNode, BookmarkItem } from '../stores/bookmarks';

function findNestedDl(element: Element): HTMLDListElement | null {
  for (const child of Array.from(element.children)) {
    if (child.tagName === 'DL') return child as HTMLDListElement;
    const nested = findNestedDl(child);
    if (nested) return nested;
  }
  return null;
}

export function parseBookmarkHtml(source: string): BookmarkImportNode[] {
  const document = new DOMParser().parseFromString(source, 'text/html');
  const root = document.querySelector('dl');
  if (!root) throw new Error('This file does not contain an HTML bookmarks list.');

  const parseList = (list: Element): BookmarkImportNode[] => {
    const result: BookmarkImportNode[] = [];
    const visit = (container: Element) => {
      for (const child of Array.from(container.children)) {
        if (child.tagName === 'DT') {
          const anchor = Array.from(child.children).find((element) => element.tagName === 'A') as HTMLAnchorElement | undefined;
          if (anchor?.getAttribute('href')) {
            result.push({ title: anchor.textContent?.trim() || anchor.href, url: anchor.getAttribute('href') || '' });
            continue;
          }
          const heading = Array.from(child.children).find((element) => element.tagName === 'H3');
          if (heading) {
            const nested = findNestedDl(child);
            result.push({ title: heading.textContent?.trim() || 'Folder', children: nested ? parseList(nested) : [] });
            continue;
          }
        }
        if (child.tagName === 'DL' || child.tagName === 'P' || child.tagName === 'DT') visit(child);
      }
    };
    visit(list);
    return result;
  };

  return parseList(root);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);
}

export function exportBookmarkHtml(items: BookmarkItem[]): string {
  const serialize = (parentId: string | null): string => items
    .filter((item) => item.parentId === parentId)
    .map((item) => item.kind === 'folder'
      ? `<DT><H3>${escapeHtml(item.title)}</H3>\n<DL><p>\n${serialize(item.id)}</DL><p>`
      : `<DT><A HREF="${escapeHtml(item.url)}">${escapeHtml(item.title)}</A>`)
    .join('\n');
  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Orb Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n${serialize(null)}\n</DL><p>\n`;
}
