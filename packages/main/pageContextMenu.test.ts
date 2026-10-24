import { describe, expect, it, vi } from 'vitest';
import { buildPageContextMenu, type PageContextActions } from './pageContextMenu';

function actions(overrides: Partial<PageContextActions> = {}): PageContextActions {
  return {
    openInNewTab: vi.fn(),
    copyText: vi.fn(),
    saveImage: vi.fn(),
    goBack: vi.fn(),
    goForward: vi.fn(),
    reload: vi.fn(),
    inspect: vi.fn(),
    canGoBack: true,
    canGoForward: false,
    ...overrides,
  };
}

const labels = (items: ReturnType<typeof buildPageContextMenu>) =>
  items.map((item) => item.label ?? item.role ?? item.type);

describe('buildPageContextMenu', () => {
  it('offers link actions for http links', () => {
    const items = buildPageContextMenu({ linkURL: 'https://example.com/page' }, actions());
    expect(labels(items)).toContain('Open link in new tab');
    expect(labels(items)).toContain('Copy link address');
  });

  it('ignores unsafe link schemes', () => {
    const items = buildPageContextMenu({ linkURL: 'javascript:alert(1)' }, actions());
    expect(labels(items)).not.toContain('Open link in new tab');
  });

  it('offers image actions for image media', () => {
    const items = buildPageContextMenu({ srcURL: 'https://example.com/a.png', mediaType: 'image' }, actions());
    expect(labels(items)).toContain('Open image in new tab');
    expect(labels(items)).toContain('Save image as…');
    expect(labels(items)).toContain('Copy image address');
  });

  it('offers editing roles for inputs', () => {
    const items = buildPageContextMenu({ isEditable: true, selectionText: 'hello' }, actions());
    const roles = items.map((item) => item.role).filter(Boolean);
    expect(roles).toEqual(expect.arrayContaining(['cut', 'copy', 'paste', 'selectAll']));
    expect(labels(items)).not.toContain('Open link in new tab');
  });

  it('offers copy for a text selection', () => {
    const items = buildPageContextMenu({ selectionText: 'hello' }, actions());
    expect(items.some((item) => item.role === 'copy')).toBe(true);
  });

  it('reflects navigation availability', () => {
    const items = buildPageContextMenu({}, actions({ canGoBack: false, canGoForward: true }));
    expect(items.find((item) => item.label === 'Back')?.enabled).toBe(false);
    expect(items.find((item) => item.label === 'Forward')?.enabled).toBe(true);
  });

  it('always ends with inspect element', () => {
    const items = buildPageContextMenu({}, actions());
    expect(items[items.length - 1].label).toBe('Inspect element');
  });

  it('wires actions to the supplied callbacks', () => {
    const callbacks = actions();
    const items = buildPageContextMenu({ linkURL: 'https://example.com/x' }, callbacks);
    (items.find((item) => item.label === 'Open link in new tab')?.click as () => void)();
    (items.find((item) => item.label === 'Copy link address')?.click as () => void)();
    expect(callbacks.openInNewTab).toHaveBeenCalledWith('https://example.com/x');
    expect(callbacks.copyText).toHaveBeenCalledWith('https://example.com/x');
  });
});
