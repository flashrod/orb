export type FilterResourceType = 'main_frame' | 'sub_frame' | 'script' | 'stylesheet' | 'image' | 'font' | 'media' | 'xmlhttprequest' | 'websocket' | 'other';

export interface FilterRequestContext {
  resourceType: FilterResourceType | string;
  initiatorUrl?: string;
  sameSite?: boolean;
}

export function isThirdPartyRequest(requestUrl: string, initiatorUrl?: string): boolean {
  try {
    if (!initiatorUrl) return false;
    const requestHost = new URL(requestUrl).hostname;
    const initiatorHost = new URL(initiatorUrl).hostname;
    const requestSite = getDomain(requestHost) || requestHost;
    const initiatorSite = getDomain(initiatorHost) || initiatorHost;
    return requestSite !== initiatorSite;
  } catch { return false; }
}

export interface CookieContextInput {
  url: string;
  resourceType: string;
  /** Site in the address bar, i.e. `frame.top.url`. */
  topLevelUrl?: string;
  /** Origin that issued the request; survives redirects. */
  initiatorOrigin?: string;
  referrer?: string;
}

export interface CookieContext {
  thirdParty: boolean;
  initiator?: string;
}

/**
 * Decides whether a request may carry cookies.
 *
 * Comparing every request against its initiator/referrer gets two things wrong:
 *
 * 1. A top-level document is always first-party to itself. Judging it by the
 *    site that linked to it strips cookies on every cross-site click and on the
 *    OAuth redirect back to the relying party, so the session that was just
 *    created never sticks.
 * 2. Subresources belong to the site in the address bar, not to the frame that
 *    issued them, otherwise a third-party iframe looks first-party.
 */
export function cookieContext(input: CookieContextInput): CookieContext {
  // Top-level documents own their own cookies, whoever linked to them.
  if (input.resourceType === 'mainFrame') return { thirdParty: false };

  const initiator = input.topLevelUrl || input.initiatorOrigin || input.referrer || undefined;
  return { thirdParty: isThirdPartyRequest(input.url, initiator), initiator };
}

export interface NetworkFilterRule {
  action: 'block' | 'allow';
  source: string;
  domainAnchor?: string;
  includedDomains: string[];
  excludedDomains: string[];
  /** Hosts the request itself must match (uBlock `to=`). */
  includedTargets: string[];
  /** Hosts that exempt the request (uBlock `denyallow=`). */
  excludedTargets: string[];
  includedTypes: string[];
  excludedTypes: string[];
  party?: 'first' | 'third';
  regex: RegExp;
}

const nonNetworkModifiers = new Set([
  'removeparam', 'queryprune', 'redirect', 'redirect-rule', 'csp', 'permissions',
  'header', 'set-cookie', 'cookie', 'jsonprune', 'hls', 'mp4', 'replace',
  'urltransform', 'uritransform', 'inline-script', 'inline-font', 'noop',
  'empty', 'popup', 'elemhide', 'generichide', 'specifichide', 'genericblock',
  'badfilter', 'method',
]);

const resourceOptions = new Set(['document', 'subdocument', 'script', 'stylesheet', 'image', 'object', 'xmlhttprequest', 'xhr', 'font', 'media', 'websocket', 'ping', 'other']);
const nonDomainOptions = new Set([...resourceOptions, 'third-party', 'first-party', '3p', '1p', 'match-case', 'important', 'popup', 'popunder', 'generichide', 'specifichide', 'elemhide', 'object-subrequest', 'webrtc', 'empty', 'mp4', 'all']);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ruleRegex(pattern: string, domainAnchor?: string, matchCase = false): RegExp | null {
  try {
    // uBlock regex filters are `/expression/` optionally followed by flags.
    // A leading slash alone is not enough: `/a/?ad=` is a path pattern, and
    // treating it as the regex /a/ blocks every URL containing an "a".
    if (/^\/.+\/[gimsuy]*$/.test(pattern)) {
      const lastSlash = pattern.lastIndexOf('/');
      const flags = pattern.slice(lastSlash + 1).replace(/[^gimsuy]/g, '');
      return new RegExp(pattern.slice(1, lastSlash), flags.includes('i') || matchCase ? flags : `${flags}i`);
    }
    let remaining = pattern;
    let prefix = '';
    let suffix = '';
    if (remaining.startsWith('||')) {
      remaining = remaining.slice(2);
      const splitAt = remaining.search(/[\^/*|]/);
      const host = splitAt < 0 ? remaining : remaining.slice(0, splitAt);
      remaining = splitAt < 0 ? '' : remaining.slice(splitAt);
      if (!host) return null;
      domainAnchor = host.toLowerCase();
      prefix = `^https?:\\/\\/(?:[^/]+\\.)?${escapeRegExp(domainAnchor)}`;
    } else if (remaining.startsWith('|')) {
      remaining = remaining.slice(1);
      prefix = '^';
    }
    if (remaining.endsWith('|')) { remaining = remaining.slice(0, -1); suffix = '$'; }
    const body = remaining.split('').map((character) => character === '*' ? '.*' : character === '^' ? '(?:[^A-Za-z0-9_.%-]|$)' : escapeRegExp(character)).join('');
    return new RegExp(`${prefix}${body}${suffix}`, matchCase ? '' : 'i');
  } catch {
    return null;
  }
}

export function parseFilterLine(line: string): NetworkFilterRule | null {
  let input = line.trim();
  if (!input || input.startsWith('!') || input.startsWith('#') || input.startsWith('[')) return null;
  const action = input.startsWith('@@') ? 'allow' : 'block';
  if (action === 'allow') input = input.slice(2);
  let pattern = input;
  let rawOptions = '';
  const optionIndex = input.indexOf('$');
  if (optionIndex >= 0 && !(input.startsWith('/') && input.lastIndexOf('/') > optionIndex)) {
    pattern = input.slice(0, optionIndex);
    rawOptions = input.slice(optionIndex + 1);
  }
  const includedDomains: string[] = [];
  const excludedDomains: string[] = [];
  const includedTargets: string[] = [];
  const excludedTargets: string[] = [];
  const includedTypes: string[] = [];
  const excludedTypes: string[] = [];
  let party: 'first' | 'third' | undefined;
  let matchCase = false;
  let readingDomains = false;
  for (const raw of rawOptions.split(',')) {
    const option = raw.trim().toLowerCase();
    if (!option) continue;
    const negative = option.startsWith('~');
    const normalized = negative ? option.slice(1) : option;
    const modifier = normalized.split('=')[0];
    // These change behavior we do not implement; treating them as network
    // blocks would over-block (e.g. removeparam would block the whole URL).
    if (nonNetworkModifiers.has(modifier)) return null;
    if (normalized.startsWith('domain=') || normalized.startsWith('from=')) {
      readingDomains = true;
      const domains = normalized.slice(normalized.indexOf('=') + 1).split(/[|]/).filter(Boolean);
      for (const item of domains) {
        const isExcluded = item.startsWith('~');
        const domain = (isExcluded ? item.slice(1) : item).replace(/^\.+|\.+$/g, '');
        if (domain) (isExcluded ? excludedDomains : includedDomains).push(domain);
      }
      continue;
    }
    if (normalized.startsWith('to=')) {
      readingDomains = false;
      for (const item of normalized.slice(3).split('|').filter(Boolean)) {
        const isExcluded = item.startsWith('~');
        const domain = (isExcluded ? item.slice(1) : item).replace(/^\.+|\.+$/g, '');
        if (domain) (isExcluded ? excludedTargets : includedTargets).push(domain);
      }
      continue;
    }
    if (normalized.startsWith('denyallow=')) {
      readingDomains = false;
      for (const item of normalized.slice(10).split('|').filter(Boolean)) {
        const domain = item.replace(/^\.+|\.+$/g, '');
        if (domain) excludedTargets.push(domain);
      }
      continue;
    }
    if (readingDomains && !nonDomainOptions.has(normalized) && !normalized.startsWith('domain=')) {
      const domain = (negative ? option.slice(1) : option).replace(/^\.+|\.+$/g, '');
      if (domain) (negative ? excludedDomains : includedDomains).push(domain);
      continue;
    }
    readingDomains = false;
    if (resourceOptions.has(normalized)) (negative ? excludedTypes : includedTypes).push(normalized === 'xhr' ? 'xmlhttprequest' : normalized);
    if (normalized === 'third-party' || normalized === '3p') party = negative ? 'first' : 'third';
    if (normalized === 'first-party' || normalized === '1p') party = negative ? 'third' : 'first';
    if (normalized === 'match-case') matchCase = true;
  }
  const regex = ruleRegex(pattern, undefined, matchCase);
  if (!regex) return null;
  const domainAnchorMatch = pattern.match(/^\|\|([^\^/*|]+)/);
  return {
    action, source: line.trim(), domainAnchor: domainAnchorMatch?.[1]?.toLowerCase(),
    includedDomains, excludedDomains, includedTargets, excludedTargets,
    includedTypes, excludedTypes, party, regex,
  };
}

function hostMatches(host: string, domain: string): boolean {
  const normalizedHost = host.toLowerCase().replace(/\.$/, '');
  const normalizedDomain = domain.toLowerCase().replace(/^\.+|\.+$/g, '');
  return normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`);
}

export function matchesFilterRule(rule: NetworkFilterRule, url: string, context: FilterRequestContext): boolean {
  let target: URL;
  try { target = new URL(url); } catch { return false; }
  if (rule.domainAnchor && !hostMatches(target.hostname, rule.domainAnchor)) return false;
  if (rule.includedTargets.length && !rule.includedTargets.some((domain) => hostMatches(target.hostname, domain))) return false;
  if (rule.excludedTargets.some((domain) => hostMatches(target.hostname, domain))) return false;
  const type = context.resourceType.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase().replace(/-/g, '_');
  if (rule.includedTypes.length && !rule.includedTypes.includes(type) && !(type === 'sub_frame' && rule.includedTypes.includes('subdocument')) && !(type === 'main_frame' && rule.includedTypes.includes('document')) && !(type === 'xmlhttprequest' && rule.includedTypes.includes('xhr'))) return false;
  if (rule.excludedTypes.includes(type)) return false;
  let initiator: URL | null = null;
  try { if (context.initiatorUrl) initiator = new URL(context.initiatorUrl); } catch { initiator = null; }
  if (rule.includedDomains.length && (!initiator || !rule.includedDomains.some((domain) => hostMatches(initiator!.hostname, domain)))) return false;
  if (rule.excludedDomains.some((domain) => initiator && hostMatches(initiator.hostname, domain))) return false;
  const targetSite = getDomain(target.hostname) || target.hostname;
  const initiatorSite = initiator ? getDomain(initiator.hostname) || initiator.hostname : null;
  const sameSite = context.sameSite ?? Boolean(initiatorSite && targetSite === initiatorSite);
  if (rule.party === 'third' && sameSite) return false;
  if (rule.party === 'first' && !sameSite) return false;
  return rule.regex.test(url);
}

/**
 * Pre-indexes rules by their domain anchor so a request only evaluates rules
 * that can possibly match its host (plus the generic set), instead of scanning
 * every rule in every list.
 */
export class FilterRuleIndex {
  private readonly generic: NetworkFilterRule[] = [];
  private readonly byDomain = new Map<string, NetworkFilterRule[]>();

  constructor(rules: NetworkFilterRule[]) {
    for (const rule of rules) {
      if (rule.domainAnchor) {
        const anchor = rule.domainAnchor.toLowerCase();
        const list = this.byDomain.get(anchor) ?? [];
        list.push(rule);
        this.byDomain.set(anchor, list);
      } else {
        this.generic.push(rule);
      }
    }
  }

  get size(): number {
    let total = this.generic.length;
    for (const list of this.byDomain.values()) total += list.length;
    return total;
  }

  candidates(url: string): NetworkFilterRule[] {
    let host: string;
    try {
      host = new URL(url).hostname.toLowerCase().replace(/\.$/, '');
    } catch {
      return [];
    }
    if (!host) return [];
    const result = [...this.generic];
    const labels = host.split('.');
    for (let index = 0; index < labels.length; index += 1) {
      const list = this.byDomain.get(labels.slice(index).join('.'));
      if (list) result.push(...list);
    }
    return result;
  }

  decide(url: string, context: FilterRequestContext): 'block' | 'allow' | 'none' {
    let blocked = false;
    for (const rule of this.candidates(url)) {
      if (!matchesFilterRule(rule, url, context)) continue;
      if (rule.action === 'allow') return 'allow';
      blocked = true;
    }
    return blocked ? 'block' : 'none';
  }

  firstBlockMatch(url: string, context: FilterRequestContext): NetworkFilterRule | undefined {
    for (const rule of this.candidates(url)) {
      if (rule.action === 'block' && matchesFilterRule(rule, url, context)) return rule;
    }
    return undefined;
  }
}

export function decideFilterAction(
  rules: NetworkFilterRule[] | FilterRuleIndex,
  url: string,
  context: FilterRequestContext,
): 'block' | 'allow' | 'none' {
  return rules instanceof FilterRuleIndex ? rules.decide(url, context) : new FilterRuleIndex(rules).decide(url, context);
}
import { getDomain } from 'tldts';

