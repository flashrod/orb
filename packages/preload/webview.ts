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

// Page-to-main channels forwarded from DOM custom events. The page must never
// be able to call these directly: it can only dispatch events that the preload
// validates and relays. This removes window.orbPageApi entirely so sites
// cannot fingerprint Orb or spoof picker results.
const MAX_PICKED_ELEMENT_DEPTH = 50;

export function isValidPickedElement(payload: unknown): payload is { selector: string; label: string; score: number } {  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.selector === 'string' && p.selector.length > 0 && p.selector.length <= 1000 &&
    typeof p.label === 'string' && p.label.length <= 500 &&
    typeof p.score === 'number' && Number.isFinite(p.score)
  );
}

export function isValidGlanceUrl(payload: unknown): payload is string {
  return typeof payload === 'string' && payload.length > 0 && payload.length <= 2048;
}

document.addEventListener('orb:page-picked-element', (event) => {
  const detail = (event as CustomEvent).detail;
  if (!isValidPickedElement(detail)) return;
  try { ipcRenderer.send('orb:page-picked-element', detail); } catch {}
});

document.addEventListener('orb:glance-link', (event) => {
  const detail = (event as CustomEvent).detail;
  if (!isValidGlanceUrl(detail)) return;
  try { ipcRenderer.send('orb:glance-link', detail); } catch {}
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

// Track hovered links for Glance previews. Runs in the page's main world so it
// can see pointerover on anchors; the preload relays the CustomEvent to main.
void webFrame.executeJavaScript(`(() => {
  if (window.__orbGlanceLinkTracking) return;
  window.__orbGlanceLinkTracking = true;
  document.addEventListener('pointerover', (event) => {
    const target = event.target;
    const anchor = target instanceof Element ? target.closest('a[href]') : null;
    if (anchor) {
      document.dispatchEvent(new CustomEvent('orb:glance-link', { detail: anchor.href, bubbles: true }));
    }
  }, true);
})()`).catch(() => undefined);
