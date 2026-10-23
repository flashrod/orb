import { app, session, dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { decideFilterAction, FilterRequestContext, NetworkFilterRule, matchesFilterRule, parseFilterLine } from './filterRules';

// Filter list sources (from Arc's manifest.json reverse engineering)
type FilterListType = 'generic' | 'privacy' | 'cookies';
interface FilterListSource { id: string; name: string; type: FilterListType; url: string; enabled: boolean; custom?: boolean }
interface FilterListStatus extends FilterListSource { lastUpdated: number | null; ruleCount: number; error: string | null }

const FILTER_LIST_SOURCES: FilterListSource[] = [
  {
    id: 'easylist',
    name: 'EasyList',
    type: 'generic' as const,
    url: 'https://easylist.to/easylist/easylist.txt',
    enabled: true,
  },
  {
    id: 'ublock',
    name: 'uBlock Origin Filters',
    type: 'generic' as const,
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
    enabled: true,
  },
  {
    id: 'easyprivacy',
    name: 'EasyPrivacy',
    type: 'privacy' as const,
    url: 'https://easylist.to/easylist/easyprivacy.txt',
    enabled: true,
  },
  {
    id: 'cookiemonster',
    name: 'CookieMonster',
    type: 'cookies' as const,
    url: 'https://secure.fanboy.co.nz/fanboy-cookiemonster.txt',
    enabled: false,
  },
];

// A parsed network filter rule
// A parsed cosmetic (element hiding) filter rule
interface CosmeticFilterRule {
  selector: string;       // CSS selector to hide
  domain?: string;        // domain the selector applies to (undefined = global)
  isRegexSelect: boolean; // ##+ vs ##
}

export class AdBlocker {
  private networkRules: NetworkFilterRule[] = [];
  private trackerRules: NetworkFilterRule[] = [];
  private cosmeticRules: CosmeticFilterRule[] = [];
  private userAllowlist: Set<string> = new Set(); // domains the user explicitly allows
  private blockedRequests: { id: string; request: string; site: string; resourceType: string; rule: string; blockedAt: number }[] = [];
  private filterSources = [...FILTER_LIST_SOURCES];
  private filterListStatuses: FilterListStatus[] = this.filterSources.map((source) => ({ ...source, lastUpdated: null, ruleCount: 0, error: null }));

  enabled = true;
  trackerBlockingEnabled = true;
  cosmeticFilteringEnabled = true;
  httpsOnlyEnabled = false;
  private preferencesLoaded = false;

  loadPreferences(): void {
    if (this.preferencesLoaded) return;
    this.preferencesLoaded = true;
    try {
      const file = path.join(app.getPath('userData'), 'privacy-preferences.json');
      const state = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<{ enabled: boolean; trackerBlockingEnabled: boolean; cosmeticFilteringEnabled: boolean; httpsOnlyEnabled: boolean; userAllowlist: string[]; filterLists: FilterListSource[] }>;
      if (typeof state.enabled === 'boolean') this.enabled = state.enabled;
      if (typeof state.trackerBlockingEnabled === 'boolean') this.trackerBlockingEnabled = state.trackerBlockingEnabled;
      if (typeof state.cosmeticFilteringEnabled === 'boolean') this.cosmeticFilteringEnabled = state.cosmeticFilteringEnabled;
      if (typeof state.httpsOnlyEnabled === 'boolean') this.httpsOnlyEnabled = state.httpsOnlyEnabled;
      if (Array.isArray(state.userAllowlist)) this.userAllowlist = new Set(state.userAllowlist.filter((item) => typeof item === 'string').map((item) => item.toLowerCase()));
      if (Array.isArray(state.filterLists)) {
        const saved = new Map(state.filterLists.map((item) => [item.id, item]));
        this.filterSources = FILTER_LIST_SOURCES.map((source) => ({ ...source, enabled: saved.get(source.id)?.enabled ?? source.enabled }));
        for (const source of state.filterLists) if (source.custom && /^https:\/\//i.test(source.url)) this.filterSources.push(source);
        this.filterListStatuses = this.filterSources.map((source) => ({ ...source, lastUpdated: null, ruleCount: 0, error: null }));
      }
    } catch { /* First launch uses conservative defaults. */ }
  }

  private persistPreferences(): void {
    try {
      fs.mkdirSync(app.getPath('userData'), { recursive: true });
      fs.writeFileSync(path.join(app.getPath('userData'), 'privacy-preferences.json'), JSON.stringify({
        enabled: this.enabled,
        trackerBlockingEnabled: this.trackerBlockingEnabled,
        cosmeticFilteringEnabled: this.cosmeticFilteringEnabled,
        httpsOnlyEnabled: this.httpsOnlyEnabled,
        userAllowlist: [...this.userAllowlist],
        filterLists: this.filterSources,
      }, null, 2));
    } catch (error) { console.error('[Privacy] Could not persist preferences:', error); }
  }

  async loadLists(sources: FilterListSource[] = this.filterSources): Promise<void> {
    const networkRules: NetworkFilterRule[] = [];
    const trackerRules: NetworkFilterRule[] = [];
    const cosmeticRules: CosmeticFilterRule[] = [];

    for (const source of sources.filter((item) => item.enabled)) {
      const startedAt = Date.now();
      let ruleCount = 0;
      try {
        const response = await fetch(source.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        const lines = text.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();

          // Skip comments, empty lines, Adblock Plus header, ! title lines
          if (!trimmed || trimmed.startsWith('!') || (trimmed.startsWith('#') && !trimmed.includes('##'))) continue;
          if (trimmed.startsWith('[Adblock')) continue;

          // Element hiding rule: example.com##.selector or ##.selector (global)
          if (trimmed.includes('##')) {
            const cosmeticRule = this.parseCosmeticRule(trimmed);
            if (cosmeticRule) { cosmeticRules.push(cosmeticRule); ruleCount++; }
            continue;
          }

          // Network rule
          const networkRule = parseFilterLine(trimmed);
          if (networkRule) {
            ruleCount++;
            if (source.type === 'privacy' || source.type === 'cookies') {
              trackerRules.push(networkRule);
            } else {
              networkRules.push(networkRule);
            }
          }
        }
        this.filterListStatuses = this.filterListStatuses.map((status) => status.id === source.id ? { ...status, lastUpdated: startedAt, ruleCount, error: null } : status);
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Could not fetch this filter list.';
        this.filterListStatuses = this.filterListStatuses.map((status) => status.id === source.id ? { ...status, error } : status);
        console.error(`[AdBlocker] Failed to load ${source.url}:`, err);
      }
    }

    this.networkRules = networkRules;
    this.trackerRules = trackerRules;
    this.cosmeticRules = cosmeticRules;

    console.log(
      `[AdBlocker] Loaded ${networkRules.length} ad network rules, ${trackerRules.length} tracker rules, ${cosmeticRules.length} cosmetic rules`
    );
  }

  getFilterLists(): FilterListStatus[] { return this.filterListStatuses.map((source) => ({ ...source })); }

  async setFilterListEnabled(id: string, enabled: boolean): Promise<FilterListStatus[]> {
    this.filterSources = this.filterSources.map((source) => source.id === id ? { ...source, enabled } : source);
    this.filterListStatuses = this.filterListStatuses.map((source) => source.id === id ? { ...source, enabled } : source);
    this.persistPreferences();
    await this.loadLists();
    return this.getFilterLists();
  }

  async addCustomFilterList(url: string, name?: string): Promise<FilterListStatus[]> {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') throw new Error('Filter lists must use HTTPS.');
    const id = `custom-${Buffer.from(parsed.href).toString('base64url').slice(0, 18)}`;
    if (!this.filterSources.some((source) => source.id === id)) {
      const source: FilterListSource = { id, name: name?.trim() || parsed.hostname, url: parsed.href, type: 'generic', enabled: true, custom: true };
      this.filterSources = [...this.filterSources, source];
      this.filterListStatuses = [...this.filterListStatuses, { ...source, lastUpdated: null, ruleCount: 0, error: null }];
      this.persistPreferences();
    }
    await this.loadLists();
    return this.getFilterLists();
  }

  async removeCustomFilterList(id: string): Promise<FilterListStatus[]> {
    if (!this.filterSources.some((source) => source.id === id && source.custom)) throw new Error('Only custom filter lists can be removed.');
    this.filterSources = this.filterSources.filter((source) => source.id !== id);
    this.filterListStatuses = this.filterListStatuses.filter((source) => source.id !== id);
    this.persistPreferences();
    await this.loadLists();
    return this.getFilterLists();
  }

  // Parse element hiding rule: example.com##.ad-banner or ##.ad-banner
  private parseCosmeticRule(raw: string): CosmeticFilterRule | null {
    const splitIndex = raw.indexOf('##');
    const domainPart = raw.slice(0, splitIndex);
    const selectorPart = raw.slice(splitIndex + 2);

    let domain: string | undefined;
    let selector = selectorPart;
    let isRegexSelect = false;

    if (domainPart) {
      domain = domainPart;
    }

    // ##+ means regex-based selector
    if (selector.startsWith('+')) {
      isRegexSelect = true;
      selector = selector.slice(1);
    }

    if (!selector) return null;

    return { selector, domain, isRegexSelect };
  }

  // ABP allow rules override block rules in the same list and apply to matching request context.
  shouldBlock(url: string, context: FilterRequestContext = { resourceType: 'other' }): boolean {
    if (!this.enabled) return false;
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if ([...this.userAllowlist].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) return false;
      return decideFilterAction(this.networkRules, url, context) === 'block';
    } catch { return false; }
  }

  shouldBlockTracker(url: string, context: FilterRequestContext = { resourceType: 'other' }): boolean {
    if (!this.trackerBlockingEnabled) return false;
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if ([...this.userAllowlist].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) return false;
      return decideFilterAction(this.trackerRules, url, context) === 'block';
    } catch { return false; }
  }

  shouldBlockRequest(url: string, context: FilterRequestContext): boolean {
    if (!this.enabled) return false;
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      const initiatorHost = context.initiatorUrl ? new URL(context.initiatorUrl).hostname.toLowerCase() : '';
      if ([...this.userAllowlist].some((domain) => [hostname, initiatorHost].some((host) => host === domain || host.endsWith(`.${domain}`)))) return false;
      const rules = [...this.networkRules, ...(this.trackerBlockingEnabled ? this.trackerRules : [])];
      if (decideFilterAction(rules, url, context) !== 'block') return false;
      const matched = rules.find((rule) => rule.action === 'block' && matchesFilterRule(rule, url, context));
      let request = `${new URL(url).origin}${new URL(url).pathname}`;
      if (request.length > 180) request = `${request.slice(0, 177)}…`;
      this.blockedRequests.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        request,
        site: initiatorHost || hostname,
        resourceType: context.resourceType,
        rule: matched?.source || 'filter rule',
        blockedAt: Date.now(),
      });
      this.blockedRequests = this.blockedRequests.slice(0, 500);
      return true;
    } catch { return false; }
  }

  getBlockedRequests() { return [...this.blockedRequests]; }
  clearBlockedRequests(): void { this.blockedRequests = []; }

  // Check if an element should be hidden (cosmetic filtering)
  shouldHideElement(domain: string, selector: string): boolean {
    if (!this.cosmeticFilteringEnabled) return false;

    for (const rule of this.cosmeticRules) {
      // Domain match: rule.domain === domain or rule.domain undefined (global)
      if (rule.domain && rule.domain !== domain) continue;

      if (rule.isRegexSelect) {
        try {
          const re = new RegExp(selector);
          if (re.test(rule.selector)) return true;
        } catch {
          // invalid regex, skip
        }
      } else {
        if (selector === rule.selector) return true;
      }
    }

    return false;
  }

  // Add a domain to the user allowlist
  addToAllowlist(domain: string): void {
    this.userAllowlist.add(domain.toLowerCase());
    this.persistPreferences();
  }

  // Remove a domain from the user allowlist
  removeFromAllowlist(domain: string): void {
    this.userAllowlist.delete(domain.toLowerCase());
    this.persistPreferences();
  }

  // Check if domain is allowlisted
  isAllowlisted(domain: string): boolean {
    return this.userAllowlist.has(domain.toLowerCase());
  }

  // Get all allowlisted domains
  getAllowlist(): string[] {
    return [...this.userAllowlist].sort();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.persistPreferences();
  }

  setTrackerBlocking(enabled: boolean): void {
    this.trackerBlockingEnabled = enabled;
    this.persistPreferences();
  }

  setCosmeticFiltering(enabled: boolean): void {
    this.cosmeticFilteringEnabled = enabled;
    this.persistPreferences();
  }

  setHttpsOnly(enabled: boolean): void {
    this.httpsOnlyEnabled = enabled;
    this.persistPreferences();
  }

  isHttpsOnly(): boolean {
    return this.httpsOnlyEnabled;
  }

  getRuleCount(): number {
    return this.networkRules.length;
  }

  getTrackerRuleCount(): number {
    return this.trackerRules.length;
  }

  getCosmeticRuleCount(): number {
    return this.cosmeticRules.length;
  }

  // Import uBlock Origin filter list from a local file path
  async importUblockList(filePath: string): Promise<number> {
    try {
      const text = fs.readFileSync(filePath, 'utf-8');
      const lines = text.split('\n');

      let imported = 0;
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('#')) continue;
        if (trimmed.startsWith('[Adblock')) continue;

        if (trimmed.includes('##')) {
          const rule = this.parseCosmeticRule(trimmed);
          if (rule) {
            this.cosmeticRules.push(rule);
            imported++;
          }
        } else {
          const rule = parseFilterLine(trimmed);
          if (rule) {
            this.networkRules.push(rule);
            imported++;
          }
        }
      }

      console.log(`[AdBlocker] Imported ${imported} uBlock rules from ${filePath}`);
      return imported;
    } catch (err) {
      console.error(`[AdBlocker] Failed to import uBlock list from ${filePath}:`, err);
      return 0;
    }
  }
}

export const adBlocker = new AdBlocker();
const initializedSessions = new WeakSet<Electron.Session>();
let filterListsLoading: Promise<void> | null = null;

export function initAdBlocker(ses: Electron.Session): void {
  adBlocker.loadPreferences();
  if (initializedSessions.has(ses)) return;
  initializedSessions.add(ses);

  // All profile sessions share the same rule data but retain separate browser storage.
  filterListsLoading ||= adBlocker.loadLists();

  // Electron keeps only one listener for each webRequest event. Combine policy
  // decisions here so tracker and HTTPS controls cannot overwrite each other.
  ses.webRequest.onBeforeRequest(
    {
      urls: ['<all_urls>'],
    },
    (details, callback) => {
      const requestDetails = details as Electron.OnBeforeRequestListenerDetails & { initiator?: string };
      const context: FilterRequestContext = {
        resourceType: details.resourceType,
        initiatorUrl: requestDetails.initiator || details.referrer || undefined,
      };
      if (adBlocker.shouldBlockRequest(details.url, context)) {
        callback({ cancel: true });
        return;
      }
      if (adBlocker.httpsOnlyEnabled && details.url.startsWith('http://')) {
        callback({ redirectURL: details.url.replace(/^http:/, 'https:') });
        return;
      }
      callback({});
    }
  );

  // Fingerprinting protection: strip/modify identifying headers
  ses.webRequest.onBeforeSendHeaders(
    {
      urls: ['<all_urls>'],
    },
    (details, callback) => {
      const headers = { ...(details.requestHeaders || {}) };

      // Remove or neutralize fingerprinting headers
      delete headers['Sec-CH-UA'];
      delete headers['Sec-CH-UA-Platform'];
      delete headers['Sec-CH-UA-Mobile'];
      delete headers['Sec-CH-UA-Model'];
      delete headers['Sec-CH-UA-Full-Version'];
      delete headers['Sec-CH-UA-Arch'];
      delete headers['Sec-CH-UA-Bitness'];
      delete headers['Sec-CH-UA-Full-Version-List'];
      delete headers['X-Client-Data'];
      delete headers['X-Requested-With'];

      // Reduce Accept-Language granularity
      if (headers['Accept-Language']) {
        headers['Accept-Language'] = headers['Accept-Language'].toString().split(',')[0];
      }

      callback({ requestHeaders: headers });
    }
  );
}
