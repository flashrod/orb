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

interface FilterRule {
  type: 'block' | 'allow';
  pattern: string;
  domain?: string;
}

export class AdBlocker {
  private rules: FilterRule[] = [];
  private trackerRules: FilterRule[] = [];
  enabled = true;
  trackerBlockingEnabled = true;

  async loadLists(sources: typeof FILTER_LIST_SOURCES = FILTER_LIST_SOURCES): Promise<void> {
    const adRules: FilterRule[] = [];
    const trackerRules: FilterRule[] = [];

    for (const source of sources) {
      try {
        const response = await fetch(source.url);
        const text = await response.text();
        const parsed = this.parseList(text);
        if (source.type === 'privacy' || source.type === 'cookies') {
          trackerRules.push(...parsed);
        } else {
          adRules.push(...parsed);
        }
      } catch (err) {
        console.error(`[AdBlocker] Failed to load ${source.url}:`, err);
      }
    }

    this.rules = adRules;
    this.trackerRules = trackerRules;
    console.log(
      `[AdBlocker] Loaded ${this.rules.length} ad rules, ${this.trackerRules.length} tracker rules`
    );
  }

  private parseList(text: string): FilterRule[] {
    const rules: FilterRule[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('#')) continue;
      // Skip Adblock Plus header
      if (trimmed.startsWith('[Adblock')) continue;
      // Skip options
      if (trimmed.startsWith('@@')) continue;

      // Simple pattern matching: convert to regex-friendly string
      let pattern = trimmed;

      // Handle domain restrictions (||domain.com^)
      if (pattern.startsWith('||') && pattern.endsWith('^')) {
        const domain = pattern.slice(2, -1);
        rules.push({ type: 'block', pattern: domain, domain });
        continue;
      }

      // Handle simple host patterns
      if (pattern.includes('*')) {
        const regexStr = pattern.replace(/\*/g, '.*').replace(/\./g, '\\.');
        rules.push({ type: 'block', pattern: regexStr });
        continue;
      }

      // Plain domain or substring
      rules.push({ type: 'block', pattern: trimmed });
    }

    return rules;
  }

  shouldBlock(url: string): boolean {
    if (!this.enabled) return false;

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      for (const rule of this.rules) {
        if (rule.domain && hostname.includes(rule.domain)) {
          return true;
        }
        if (!rule.domain && url.includes(rule.pattern)) {
          return true;
        }
      }
    } catch {
      // If URL parsing fails, don't block
    }

    return false;
  }

  shouldBlockTracker(url: string): boolean {
    if (!this.trackerBlockingEnabled) return false;

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      for (const rule of this.trackerRules) {
        if (rule.domain && hostname.includes(rule.domain)) {
          return true;
        }
        if (!rule.domain && url.includes(rule.pattern)) {
          return true;
        }
      }
    } catch {
      // If URL parsing fails, don't block
    }

    return false;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setTrackerBlocking(enabled: boolean): void {
    this.trackerBlockingEnabled = enabled;
  }

  getRuleCount(): number {
    return this.rules.length;
  }

  getTrackerRuleCount(): number {
    return this.trackerRules.length;
  }

  // Import uBlock Origin filter list from a local file path
  async importUblockList(filePath: string): Promise<number> {
    try {
      const text = fs.readFileSync(filePath, 'utf-8');
      const parsed = this.parseList(text);
      this.rules = [...this.rules, ...parsed];
      console.log(`[AdBlocker] Imported ${parsed.length} uBlock rules from ${filePath}`);
      return parsed.length;
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
