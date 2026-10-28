import { BrowserWindow, Menu, shell } from 'electron';
import { getCommandAccelerator } from '../shared/commands';

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

/** Accelerator for a command, read from the shared registry. */
function acceleratorFor(commandId: string): string | undefined {
  const accel = getCommandAccelerator(commandId);
  return accel ?? undefined;
}

export function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Orb',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Welcome to Orb',
          accelerator: acceleratorFor('show-welcome'),
          registerAccelerator: false,
          click: () => dispatch('show-welcome'),
        },
        {
          label: 'Settings…',
          accelerator: acceleratorFor('settings'),
          registerAccelerator: false,
          click: () => dispatch('settings'),
        },
        {
          label: 'Set Orb as Default Browser…',
          click: () => dispatch('default-browser'),
        },
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
          accelerator: acceleratorFor('new-tab'),
          registerAccelerator: false,
          click: () => dispatch('new-tab'),
        },
        {
          label: 'New Space',
          accelerator: acceleratorFor('new-space'),
          registerAccelerator: false,
          click: () => dispatch('new-space'),
        },
        { type: 'separator' },
        {
          label: 'Print…',
          accelerator: acceleratorFor('print'),
          registerAccelerator: false,
          click: () => dispatch('print'),
        },
        {
          label: 'Save Page as PDF…',
          accelerator: acceleratorFor('save-pdf'),
          registerAccelerator: false,
          click: () => dispatch('save-pdf'),
        },
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
        {
          label: 'Open Command Bar…',
          accelerator: acceleratorFor('command-bar'),
          registerAccelerator: false,
          click: () => dispatch('command-bar'),
        },
        {
          label: 'Focus Address Bar',
          accelerator: acceleratorFor('focus-address'),
          registerAccelerator: false,
          click: () => dispatch('focus-address'),
        },
        {
          label: 'Find…',
          accelerator: acceleratorFor('find'),
          registerAccelerator: false,
          click: () => dispatch('find'),
        },
        {
          label: 'History',
          accelerator: acceleratorFor('history'),
          registerAccelerator: false,
          click: () => dispatch('history'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Enter Full Screen',
          accelerator: acceleratorFor('toggle-fullscreen'),
          registerAccelerator: false,
          click: () => dispatch('toggle-fullscreen'),
        },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: acceleratorFor('nav.reload'),
          registerAccelerator: false,
          click: () => dispatch('nav.reload'),
        },
        {
          label: 'Hard Reload',
          accelerator: acceleratorFor('nav.hard-reload'),
          registerAccelerator: false,
          click: () => dispatch('nav.hard-reload'),
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: acceleratorFor('view.zoom-in'),
          registerAccelerator: false,
          click: () => dispatch('view.zoom-in'),
        },
        {
          label: 'Zoom Out',
          accelerator: acceleratorFor('view.zoom-out'),
          registerAccelerator: false,
          click: () => dispatch('view.zoom-out'),
        },
        {
          label: 'Actual Size',
          accelerator: acceleratorFor('view.zoom-reset'),
          registerAccelerator: false,
          click: () => dispatch('view.zoom-reset'),
        },
        { type: 'separator' },
        {
          label: 'Picture in Picture',
          click: () => dispatch('toggle-pip'),
        },
        {
          label: 'Play/Pause Media',
          click: () => dispatch('media-play-pause'),
        },
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
