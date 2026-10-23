import { contextBridge, ipcRenderer } from 'electron';

// A deliberately narrow bridge for website content. Do not expose the main
// renderer's orbApi here: pages may only suggest an HTTP(S) link to Glance.
contextBridge.exposeInMainWorld('orbPageApi', {
  suggestGlanceLink: (url: string) => ipcRenderer.sendToHost('orb:glance-link', url),
});
