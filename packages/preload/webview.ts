import { contextBridge, ipcRenderer } from 'electron';

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
