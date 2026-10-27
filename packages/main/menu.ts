import { BrowserWindow, Menu, shell } from 'electron';

/**
 * Menu items cannot call into React directly, so they dispatch the same
 * shortcut actions the renderer already understands.
 */
function dispatch(action: string): void {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  if (!win || win.isDestroyed()) return;
  win.webContents.send('orb:shortcut', action);
}

/** Public site / waitlist URL. Confirm the deployed Vercel domain before shipping. */
const WEBSITE_URL = 'https://browserorb.vercel.app';

function openWebsite(): void {
  void shell.openExternal(WEBSITE_URL);
}

export function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Orb',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { label: 'Welcome to Orb', click: () => dispatch('show-welcome') },
        { label: 'Settings…', accelerator: 'CmdOrCtrl+,', click: () => dispatch('settings') },
        { label: 'Set Orb as Default Browser…', click: () => dispatch('default-browser') },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => dispatch('new-tab'),
        },
        {
          label: 'New Space',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => dispatch('new-space'),
        },
        { type: 'separator' },
        { label: 'Print…', accelerator: 'CmdOrCtrl+P', click: () => dispatch('print') },
        { label: 'Save Page as PDF…', accelerator: 'CmdOrCtrl+Shift+S', click: () => dispatch('save-pdf') },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Open Command Bar…', accelerator: 'CmdOrCtrl+K', click: () => dispatch('command-bar') },
        { label: 'Focus Address Bar', accelerator: 'CmdOrCtrl+L', click: () => dispatch('focus-address') },
        { label: 'Find…', accelerator: 'CmdOrCtrl+F', click: () => dispatch('find') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Picture in Picture', click: () => dispatch('toggle-pip') },
        { label: 'Play/Pause Media', click: () => dispatch('media-play-pause') },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'front' }],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            const { shell } = await import('electron');
            await shell.openExternal('https://github.com/flashrod/orb');
          },
        },
        {
          label: 'Website & waitlist',
          click: openWebsite,
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
