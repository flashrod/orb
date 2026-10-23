import { session } from 'electron';

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
  private enabled = true;

  async loadLists(urls: string[] = FILTER_LIST_SOURCES.map((s) => s.url)): Promise<void> {
    const rules: FilterRule[] = [];

    for (const url of urls) {
      try {
        const response = await fetch(url);
        const text = await response.text();
        const parsed = this.parseList(text);
        rules.push(...parsed);
      } catch (err) {
        console.error(`[AdBlocker] Failed to load ${url}:`, err);
      }
    }

    this.rules = rules;
    console.log(`[AdBlocker] Loaded ${this.rules.length} filter rules`);
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
      const pathname = urlObj.pathname;

      for (const rule of this.rules) {
        if (rule.domain && hostname.includes(rule.domain)) {
          return true;
        }
        if (!rule.domain) {
          // Simple substring or regex match
          const fullUrl = url;
          if (fullUrl.includes(rule.pattern)) {
            return true;
          }
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

  getRuleCount(): number {
    return this.rules.length;
  }
}

export const adBlocker = new AdBlocker();

export function initAdBlocker(ses: Electron.Session): void {
  // Load filter lists on startup
  adBlocker.loadLists();

  // Intercept web requests
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
}
