import { contextBridge, ipcRenderer, webFrame } from 'electron';
import { YOUTUBE_AD_SCRIPT, YOUTUBE_HOST_PATTERN } from '../shared/youtubeAds';

// YouTube ships ads inside the player response. Extensions cannot prune it
// here, so do it in the page's main world before YouTube's scripts run.
if (YOUTUBE_HOST_PATTERN.test(location.hostname)) {
  try {
    void webFrame.executeJavaScript(YOUTUBE_AD_SCRIPT);
  } catch {
    // Ad blocking must never stop a page from loading.
  }
}

// A deliberately narrow bridge for website content. Do not expose the main
// renderer's orbApi here: pages may only suggest an HTTP(S) link to Glance.
contextBridge.exposeInMainWorld('orbPageApi', {
  // The native-view engine has no <webview> host, so the picker reports its
  // choice to the main process instead of resolving executeJavaScript.
  reportPickedElement: (result: unknown) => {
    try { ipcRenderer.send('orb:page-picked-element', result); } catch {}
  },
  // sendToHost only exists for <webview> guests; in a WebContentsView there is
  // no host, so the suggestion is a no-op instead of an exception.
  suggestGlanceLink: (url: string) => {
    try {
      ipcRenderer.sendToHost('orb:glance-link', url);
    } catch {
      // no host to receive it
    }
  },
});

// Tell the main process when the page holds typed input that a reload would
// discard. This is one of the signals that protects a tab from hibernation.
// Only transitions are reported, so typing does not generate IPC traffic.
const typedFields = new Set<Element>();
let lastDirty = false;

function fieldHasValue(element: Element): boolean {
  if (!element.isConnected) return false;
  const html = element as HTMLElement;
  if (html.isContentEditable) return Boolean(html.textContent?.trim());
  const value = (element as HTMLInputElement).value;
  return typeof value === 'string' && value.trim().length > 0;
}

function reportUnsavedInput(): void {
  let dirty = false;
  for (const element of typedFields) {
    if (!element.isConnected) typedFields.delete(element);
    else if (fieldHasValue(element)) dirty = true;
  }
  if (dirty === lastDirty) return;
  lastDirty = dirty;
  try {
    ipcRenderer.send('orb:page-unsaved-input', dirty);
  } catch {
    // The window may be closing.
  }
}

document.addEventListener('input', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const html = target as HTMLElement;
  if (html.isContentEditable || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    typedFields.add(target);
    reportUnsavedInput();
  }
}, true);
document.addEventListener('change', reportUnsavedInput, true);
document.addEventListener('submit', () => {
  typedFields.clear();
  reportUnsavedInput();
}, true);

