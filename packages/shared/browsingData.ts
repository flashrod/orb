/**
 * "Clear browsing data" policy.
 *
 * Pure so the selection rules can be unit-tested without Electron. The main
 * process turns the plan into Session calls; this module decides what the plan
 * means and which storage buckets belong to each checkbox.
 */

export interface ClearBrowsingDataRequest {
  history?: unknown;
  cache?: unknown;
  cookies?: unknown;
  siteData?: unknown;
}

export interface ClearBrowsingDataPlan {
  history: boolean;
  cache: boolean;
  /** Electron `clearStorageData` buckets. Empty means leave site storage alone. */
  storages: ClearStorageBucket[];
  /** Human-readable list of what will be removed. */
  labels: string[];
}

/**
 * The storage buckets Electron accepts for `clearStorageData`, minus cookies.
 * Splitting them lets the user sign out without also wiping local databases,
 * and vice versa.
 */
export type SiteDataStorage =
  | 'cachestorage'
  | 'filesystem'
  | 'indexdb'
  | 'localstorage'
  | 'serviceworkers'
  | 'shadercache';

/** A storage bucket for `clearStorageData`, including cookies. */
export type ClearStorageBucket = SiteDataStorage | 'cookies';

export const SITE_DATA_STORAGES: readonly SiteDataStorage[] = [
  'cachestorage',
  'filesystem',
  'indexdb',
  'localstorage',
  'serviceworkers',
  'shadercache',
];

/** Only literal `true` counts, so a malformed IPC payload clears nothing. */
export function planClearBrowsingData(request: unknown): ClearBrowsingDataPlan {
  const input = (request && typeof request === 'object' ? request : {}) as ClearBrowsingDataRequest;
  const history = input.history === true;
  const cache = input.cache === true;
  const cookies = input.cookies === true;
  const siteData = input.siteData === true;

  const storages: ClearStorageBucket[] = [];
  if (cookies) storages.push('cookies');
  if (siteData) storages.push(...SITE_DATA_STORAGES);

  const labels: string[] = [];
  if (history) labels.push('browsing history');
  if (cache) labels.push('cached files');
  if (cookies) labels.push('cookies');
  if (siteData) labels.push('site data');

  return { history, cache, storages, labels };
}

/** True when the selection would actually remove something. */
export function planIsEmpty(plan: ClearBrowsingDataPlan): boolean {
  return !plan.history && !plan.cache && plan.storages.length === 0;
}

/** "browsing history, cached files and cookies" */
export function describePlan(labels: readonly string[]): string {
  if (labels.length === 0) return 'nothing';
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}
