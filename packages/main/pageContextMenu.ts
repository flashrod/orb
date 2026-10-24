import type { MenuItemConstructorOptions } from 'electron';

export type PageContextActions = {
  openInNewTab: (url: string) => void;
  copyText: (text: string) => void;
  saveImage: (url: string) => void;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  inspect: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
};

export type PageContextParams = {
  linkURL?: string;
  srcURL?: string;
  mediaType?: string;
  isEditable?: boolean;
  selectionText?: string;
};

function safeHttpUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Builds the page context menu as data so the shell can use Electron's native
 * menu (which paints above WebContentsViews) without an overlay workaround.
 */
export function buildPageContextMenu(
  params: PageContextParams,
  actions: PageContextActions,
): MenuItemConstructorOptions[] {
  const items: MenuItemConstructorOptions[] = [];
  const link = safeHttpUrl(params.linkURL);

  if (link) {
    items.push(
      { label: 'Open link in new tab', click: () => actions.openInNewTab(link) },
      { label: 'Copy link address', click: () => actions.copyText(link) },
      { type: 'separator' },
    );
  }

  const image = params.mediaType === 'image' ? safeHttpUrl(params.srcURL) : null;
  if (image) {
    items.push(
      { label: 'Open image in new tab', click: () => actions.openInNewTab(image) },
      { label: 'Save image as…', click: () => actions.saveImage(image) },
      { label: 'Copy image address', click: () => actions.copyText(image) },
      { type: 'separator' },
    );
  }

  if (params.isEditable) {
    items.push(
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
      { type: 'separator' },
    );
  } else if (params.selectionText?.trim()) {
    items.push({ role: 'copy' }, { type: 'separator' });
  }

  items.push(
    { label: 'Back', enabled: actions.canGoBack, click: actions.goBack },
    { label: 'Forward', enabled: actions.canGoForward, click: actions.goForward },
    { label: 'Reload', click: actions.reload },
    { type: 'separator' },
    { label: 'Inspect element', click: actions.inspect },
  );

  return items;
}
