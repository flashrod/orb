import { session, dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { decideFilterAction, FilterRequestContext, NetworkFilterRule, matchesFilterRule, parseFilterLine } from './filterRules';

// Filter list sources (from Arc's manifest.json reverse engineering)
const FILTER_LIST_SOURCES = [
  {
    id: 'easylist',
    name: 'EasyList',
    type: 'generic' as const,
    url: 'https://easylist.to/easylist/easylist.txt',
  },
  {
    id: 'ublock',
    name: 'uBlock Origin Filters',
    type: 'generic' as const,
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
  },
  {
    id: 'easyprivacy',
    name: 'EasyPrivacy',
    type: 'privacy' as const,
    url: 'https://easylist.to/easylist/easyprivacy.txt',
  },
  {
    id: 'cookiemonster',
    name: 'CookieMonster',
    type: 'cookies' as const,
    url: 'https://secure.fanboy.co.nz/fanboy-cookiemonster.txt',
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

  enabled = true;
  trackerBlockingEnabled = true;
  cosmeticFilteringEnabled = true;
  httpsOnlyEnabled = false;

  async loadLists(sources: typeof FILTER_LIST_SOURCES = FILTER_LIST_SOURCES): Promise<void> {
    const networkRules: NetworkFilterRule[] = [];
    const trackerRules: NetworkFilterRule[] = [];
    const cosmeticRules: CosmeticFilterRule[] = [];

    for (const source of sources) {
      try {
        const response = await fetch(source.url);
        const text = await response.text();
        const lines = text.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();

          // Skip comments, empty lines, Adblock Plus header, ! title lines
          if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('#')) continue;
          if (trimmed.startsWith('[Adblock')) continue;

          // Element hiding rule: example.com##.selector or ##.selector (global)
          if (trimmed.includes('##')) {
            const cosmeticRule = this.parseCosmeticRule(trimmed);
            if (cosmeticRule) cosmeticRules.push(cosmeticRule);
            continue;
          }

          // Network rule
          const networkRule = parseFilterLine(trimmed);
          if (networkRule) {
            if (source.type === 'privacy' || source.type === 'cookies') {
              trackerRules.push(networkRule);
            } else {
              networkRules.push(networkRule);
            }
          }
        }
      } catch (err) {
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
      if ([...this.userAllowlist].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) return false;
      const rules = [...this.networkRules, ...(this.trackerBlockingEnabled ? this.trackerRules : [])];
      return decideFilterAction(rules, url, context) === 'block';
    } catch { return false; }
  }

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
  }

  // Remove a domain from the user allowlist
  removeFromAllowlist(domain: string): void {
    this.userAllowlist.delete(domain.toLowerCase());
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
  }

  setTrackerBlocking(enabled: boolean): void {
    this.trackerBlockingEnabled = enabled;
  }

  setCosmeticFiltering(enabled: boolean): void {
    this.cosmeticFilteringEnabled = enabled;
  }

  setHttpsOnly(enabled: boolean): void {
    this.httpsOnlyEnabled = enabled;
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
