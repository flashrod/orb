import { session, dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

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
interface NetworkFilterRule {
  type: 'block' | 'allow';
  pattern: string;        // string to match or regex source
  isRegex: boolean;
  domain?: string;        // domain restriction (||domain.com^)
  options: Set<string>;   // $script, $image, $stylesheet, $third-party, etc.
  applyToDomains: string[]; // $domain=example.com,foo.com
  exceptDomains: string[];  // $domain=~example.com
}

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

          // Allowlist rule: @@||example.com^
          if (trimmed.startsWith('@@')) {
            const allowRule = this.parseNetworkRule(trimmed.slice(2));
            if (allowRule) {
              // For allowlist, we add domain to userAllowlist if it's a domain rule
              if (allowRule.domain) {
                this.userAllowlist.add(allowRule.domain);
              }
            }
            continue;
          }

          // Element hiding rule: example.com##.selector or ##.selector (global)
          if (trimmed.includes('##')) {
            const cosmeticRule = this.parseCosmeticRule(trimmed);
            if (cosmeticRule) cosmeticRules.push(cosmeticRule);
            continue;
          }

          // Network rule
          const networkRule = this.parseNetworkRule(trimmed);
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

  // Parse a network filter rule (||domain.com^, ||domain.com^$script,third-party, /regex/)
  private parseNetworkRule(raw: string): NetworkFilterRule | null {
    let ruleText = raw.trim();
    if (!ruleText) return null;

    let isRegex = false;
    let options: Set<string> = new Set();
    let applyToDomains: string[] = [];
    let exceptDomains: string[] = [];

    // Regex rule: /pattern/options
    if (ruleText.startsWith('/') && ruleText.lastIndexOf('/') > 0) {
      const lastSlash = ruleText.lastIndexOf('/');
      const regexSource = ruleText.slice(1, lastSlash);
      const regexOpts = ruleText.slice(lastSlash + 1);
      isRegex = true;
      ruleText = regexSource;
      // Parse regex option flags
      for (const ch of regexOpts) {
        options.add(ch);
      }
    }

    // Split options: ||domain.com^$script,image
    const optionSplit = ruleText.split('$');
    const basePattern = optionSplit[0];
    const optionString = optionSplit[1] || '';

    // Parse $options
    if (optionString) {
      for (const opt of optionString.split(',')) {
        const trimmedOpt = opt.trim();
        if (!trimmedOpt) continue;

        // $domain=example.com,~foo.com
        if (trimmedOpt.startsWith('domain=')) {
          const domains = trimmedOpt.slice(7).split(',');
          for (const d of domains) {
            if (d.startsWith('~')) {
              exceptDomains.push(d.slice(1));
            } else {
              applyToDomains.push(d);
            }
          }
        } else {
          options.add(trimmedOpt);
        }
      }
    }

    // Detect domain anchor: ||domain.com^
    let domain: string | undefined;
    let pattern = basePattern;

    if (basePattern.startsWith('||') && basePattern.endsWith('^')) {
      domain = basePattern.slice(2, -1);
      pattern = domain; // match against hostname
    } else if (basePattern.startsWith('|') && basePattern.endsWith('^')) {
      // Anchored to start: |http://example.com
      domain = undefined;
      pattern = basePattern.slice(1, -1);
    } else if (basePattern.endsWith('^')) {
      // End anchor: example.com^
      domain = basePattern.slice(0, -1);
      pattern = domain;
    }

    // Determine type (block vs allow - allowlist already handled above)
    const type: 'block' | 'allow' = 'block';

    return { type, pattern, isRegex, domain, options, applyToDomains, exceptDomains };
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

  // Check if a URL should be blocked by ad rules
  shouldBlock(url: string): boolean {
    if (!this.enabled) return false;

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // User allowlist takes precedence
      if (this.userAllowlist.has(hostname)) return false;

      for (const rule of this.networkRules) {
        if (!this.matchesNetworkRule(rule, url, hostname)) continue;
        return true;
      }
    } catch {
      // If URL parsing fails, don't block
    }

    return false;
  }

  // Check if a URL should be blocked by tracker rules
  shouldBlockTracker(url: string): boolean {
    if (!this.trackerBlockingEnabled) return false;

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      if (this.userAllowlist.has(hostname)) return false;

      for (const rule of this.trackerRules) {
        if (!this.matchesNetworkRule(rule, url, hostname)) continue;
        return true;
      }
    } catch {
      // If URL parsing fails, don't block
    }

    return false;
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

  private matchesNetworkRule(
    rule: NetworkFilterRule,
    url: string,
    hostname: string
  ): boolean {
    // Domain anchor check
    if (rule.domain) {
      if (!hostname.includes(rule.domain)) return false;
    }

    // $domain= restriction
    if (rule.applyToDomains.length > 0) {
      if (!rule.applyToDomains.some((d) => hostname.includes(d))) return false;
    }

    // $domain=~ exception
    if (rule.exceptDomains.length > 0) {
      if (rule.exceptDomains.some((d) => hostname.includes(d))) return false;
    }

    // $third-party check - need request domain context, skip for now (treat as match)
    // In a full implementation we'd compare request origin vs top-frame origin

    // Option filters
    if (rule.options.has('script') && !rule.options.has('image')) {
      // If only $script, we can't determine resource type from URL alone in onBeforeRequest
      // This is a limitation; full implementation needs webRequest with resourceType
    }

    // Pattern match
    if (rule.isRegex) {
      try {
        return new RegExp(rule.pattern).test(url);
      } catch {
        return false;
      }
    }

    return url.includes(rule.pattern) || hostname.includes(rule.pattern);
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
        if (trimmed.startsWith('@@')) continue;

        if (trimmed.includes('##')) {
          const rule = this.parseCosmeticRule(trimmed);
          if (rule) {
            this.cosmeticRules.push(rule);
            imported++;
          }
        } else {
          const rule = this.parseNetworkRule(trimmed);
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

export function initAdBlocker(ses: Electron.Session): void {
  // Load filter lists on startup
  adBlocker.loadLists();

  // Intercept web requests for ad blocking
  ses.webRequest.onBeforeRequest(
    {
      urls: ['<all_urls>'],
    },
    (details, callback) => {
      if (adBlocker.shouldBlock(details.url)) {
        callback({ cancel: true });
      } else {
        callback({});
      }
    }
  );

  // Intercept web requests for tracker blocking
  ses.webRequest.onBeforeRequest(
    {
      urls: ['<all_urls>'],
    },
    (details, callback) => {
      if (adBlocker.shouldBlockTracker(details.url)) {
        callback({ cancel: true });
      } else {
        callback({});
      }
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
