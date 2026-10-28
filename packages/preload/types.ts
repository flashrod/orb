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
  clearProfileData: (profileId: string) => Promise<{ cleared: boolean }>;
  saveDialog: (options: any) => Promise<any>;
  openDialog: (options: any) => Promise<any>;
  savePdf: (data: Uint8Array, suggestedName: string) => Promise<{ saved: boolean; path?: string; error?: string }>;
  getAppVersion: () => Promise<string>;
  getBuildInfo: () => Promise<{ version: string; electron: string; chromium: string; node: string; platform: string; arch: string }>;
  clearBrowsingData: (request: { history?: boolean; cache?: boolean; cookies?: boolean; siteData?: boolean }) => Promise<{ ok: boolean; labels: string[]; profiles?: number; error?: string }>;
  takeLaunchUrl?: () => Promise<string | null>;
  getDefaultBrowserStatus: () => Promise<{ isDefault: boolean; platform: string }>;
  setDefaultBrowser: () => Promise<{ isDefault: boolean; platform: string }>;
  openDefaultBrowserSettings: () => Promise<{ opened: boolean }>;
  toggleAdBlocker: (enabled: boolean) => Promise<void>;
  getAdBlockerStatus: () => Promise<any>;
  addAdBlockerAllowlist: (domain: string) => Promise<string[]>;
  removeAdBlockerAllowlist: (domain: string) => Promise<string[]>;
  clearBlockedRequestLog: () => Promise<{ cleared: boolean }>;
  setFilterListEnabled: (id: string, enabled: boolean) => Promise<any[]>;
  addFilterList: (url: string, name?: string) => Promise<any[]>;
  removeFilterList: (id: string) => Promise<any[]>;
  refreshFilterLists: () => Promise<any[]>;
  setThirdPartyCookieBlocking: (enabled: boolean) => Promise<{ enabled: boolean }>;
  setFingerprintingProtection: (enabled: boolean) => Promise<{ enabled: boolean }>;
  setWebRtcProtection: (enabled: boolean) => Promise<{ enabled: boolean }>;
  importUblockList: (filePath: string) => Promise<any>;
  toggleTrackerBlocking: (enabled: boolean) => Promise<void>;
  getTrackerBlockingStatus: () => Promise<any>;
  toggleHttpsOnly: (enabled: boolean) => Promise<void>;
  getHttpsOnlyStatus: () => Promise<any>;
  getBoosts: () => Promise<BoostRecord[]>;
  saveBoost: (boost: NewBoost) => Promise<BoostRecord>;
  deleteBoost: (id: string) => Promise<{ deleted: boolean }>;
  // Permissions
  permissionRespond: (id: string, allowed: boolean) => Promise<void>;
  getPermissions: () => Promise<Array<{ host: string; permission: string; state: string; updatedAt: number }>>;
  setPermission: (host: string, permission: string, state: string) => Promise<{ ok: boolean }>;
  removePermission: (host: string, permission: string) => Promise<{ ok: boolean }>;
  // Downloads
  getDownloads: () => Promise<Array<{ id: string; url: string; filePath: string | null; totalBytes: number; receivedBytes: number; state: string; startedAt: number; completedAt: number | null }>>;
  cancelDownload: (id: string) => Promise<{ ok: boolean }>;
  removeDownload: (id: string) => Promise<{ ok: boolean }>;
  clearCompletedDownloads: () => Promise<{ ok: boolean }>;
  setDownloadPath: (p: string) => Promise<{ ok: boolean; path: string }>;
  getDownloadPath: () => Promise<string>;
  on: (channel: string, listener: (payload: unknown) => void) => number;
  off: (subscriptionId: number) => void;
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
  clearProfileData: async () => ({ cleared: true }),
  saveDialog: async () => Promise.resolve({}),
  openDialog: async () => Promise.resolve({}),
  savePdf: async () => ({ saved: false }),
  getAppVersion: async () => '0.1.0',
  getBuildInfo: async () => ({ version: '0.1.0', electron: '', chromium: '', node: '', platform: 'darwin', arch: 'arm64' }),
  clearBrowsingData: async () => ({ ok: true, labels: [] }),
  getDefaultBrowserStatus: async () => ({ isDefault: false, platform: 'darwin' }),
  setDefaultBrowser: async () => ({ isDefault: false, platform: 'darwin' }),
  openDefaultBrowserSettings: async () => ({ opened: false }),
  toggleAdBlocker: async () => {},
  getAdBlockerStatus: async () => ({ enabled: true, ruleCount: 0 }),
  addAdBlockerAllowlist: async () => [],
  removeAdBlockerAllowlist: async () => [],
  clearBlockedRequestLog: async () => ({ cleared: true }),
  setFilterListEnabled: async () => [],
  addFilterList: async () => [],
  removeFilterList: async () => [],
  refreshFilterLists: async () => [],
  setThirdPartyCookieBlocking: async (enabled) => ({ enabled }),
  setFingerprintingProtection: async (enabled) => ({ enabled }),
  setWebRtcProtection: async (enabled) => ({ enabled }),
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
  permissionRespond: async () => {},
  getPermissions: async () => [],
  setPermission: async () => ({ ok: true }),
  removePermission: async () => ({ ok: true }),
  // Downloads
  getDownloads: async () => [],
  cancelDownload: async () => ({ ok: true }),
  removeDownload: async () => ({ ok: true }),
  clearCompletedDownloads: async () => ({ ok: true }),
  setDownloadPath: async () => ({ ok: true, path: '' }),
  getDownloadPath: async () => '',
  on: () => 0,
  off: () => {},
};
