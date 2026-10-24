import { contextBridge, ipcRenderer } from 'electron';

// A deliberately narrow bridge for website content. Do not expose the main
// renderer's orbApi here: pages may only suggest an HTTP(S) link to Glance.
contextBridge.exposeInMainWorld('orbPageApi', {
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
