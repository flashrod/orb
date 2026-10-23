export interface ExposedApi {
  getWindowById: (webContentsId: number) => Promise<any>;
  openExternal: (url: string) => Promise<void>;
  toggleDevTools: (webContentsId: number) => Promise<void>;
  focusWindow: (webContentsId: number) => Promise<void>;
  saveDialog: (options: any) => Promise<any>;
  openDialog: (options: any) => Promise<any>;
  getAppVersion: () => Promise<string>;
  toggleAdBlocker: (enabled: boolean) => Promise<void>;
  getAdBlockerStatus: () => Promise<any>;
  importUblockList: (filePath: string) => Promise<any>;
  toggleTrackerBlocking: (enabled: boolean) => Promise<void>;
  getTrackerBlockingStatus: () => Promise<any>;
  getBoosts: () => Promise<any[]>;
  saveBoost: (boost: any) => Promise<void>;
  deleteBoost: (id: string) => Promise<void>;
}

export const exposedApi: ExposedApi = {
  // These are implemented in the preload script via contextBridge
  // This type file is for TypeScript in the renderer
  getWindowById: () => Promise.resolve(null),
  openExternal: async () => {},
  toggleDevTools: async () => {},
  focusWindow: async () => {},
  saveDialog: async () => Promise.resolve({}),
  openDialog: async () => Promise.resolve({}),
  getAppVersion: async () => '0.1.0',
  toggleAdBlocker: async () => {},
  getAdBlockerStatus: async () => ({ enabled: true, ruleCount: 0 }),
  importUblockList: async () => ({ imported: 0, total: 0 }),
  toggleTrackerBlocking: async () => {},
  getTrackerBlockingStatus: async () => ({
    trackerBlockingEnabled: true,
    trackerRuleCount: 0,
  }),
  getBoosts: async () => [],
  saveBoost: async () => {},
  deleteBoost: async () => {},
};
