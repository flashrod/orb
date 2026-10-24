const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bench', {
  onStart: (listener) => {
    ipcRenderer.on('benchmark:start', (_event, payload) => listener(payload));
  },
  onContinue: (listener) => {
    ipcRenderer.on('benchmark:continue', () => listener());
  },
  report: (payload) => ipcRenderer.send('benchmark:report', payload),
});
