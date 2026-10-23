import { BoostRecord, NewBoost } from '../shared/boosts';

export interface ExposedApi {
  listExtensions: () => Promise<{ id: string; name: string; version: string }[]>;
  installExtension: () => Promise<{ id: string; name: string; version: string } | null>;
  removeExtension: (id: string) => Promise<{ removed: boolean }>;
  getWindowById: (webContentsId: number) => Promise<any>;
  openExternal: (url: string) => Promise<void>;
  toggleDevTools: () => Promise<void>;
  minimizeCurrentWindow: () => Promise<void>;
  focusWindow: (webContentsId: number) => Promise<void>;
  saveDialog: (options: any) => Promise<any>;
  openDialog: (options: any) => Promise<any>;
  getAppVersion: () => Promise<string>;
  toggleAdBlocker: (enabled: boolean) => Promise<void>;
  getAdBlockerStatus: () => Promise<any>;
  importUblockList: (filePath: string) => Promise<any>;
  toggleTrackerBlocking: (enabled: boolean) => Promise<void>;
  getTrackerBlockingStatus: () => Promise<any>;
  toggleHttpsOnly: (enabled: boolean) => Promise<void>;
  getHttpsOnlyStatus: () => Promise<any>;
  getBoosts: () => Promise<BoostRecord[]>;
  saveBoost: (boost: NewBoost) => Promise<BoostRecord>;
  deleteBoost: (id: string) => Promise<{ deleted: boolean }>;
}

export const exposedApi: ExposedApi = {
  listExtensions: async () => [],
  installExtension: async () => null,
  removeExtension: async () => ({ removed: true }),
  // These are implemented in the preload script via contextBridge
  // This type file is for TypeScript in the renderer
  getWindowById: () => Promise.resolve(null),
  openExternal: async () => {},
  toggleDevTools: async () => {},
  minimizeCurrentWindow: async () => {},
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
  toggleHttpsOnly: async () => {},
  getHttpsOnlyStatus: async () => ({ httpsOnlyEnabled: false }),
  getBoosts: async () => [],
  saveBoost: async (boost) => ({
    ...boost,
    createdAt: boost.createdAt ?? Date.now(),
    updatedAt: boost.updatedAt ?? Date.now(),
  }),
  deleteBoost: async () => ({ deleted: true }),
};
