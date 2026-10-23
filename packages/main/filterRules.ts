export type FilterResourceType = 'main_frame' | 'sub_frame' | 'script' | 'stylesheet' | 'image' | 'font' | 'media' | 'xmlhttprequest' | 'websocket' | 'other';

export interface FilterRequestContext {
  resourceType: FilterResourceType | string;
  initiatorUrl?: string;
  sameSite?: boolean;
}

export interface NetworkFilterRule {
  action: 'block' | 'allow';
  source: string;
  domainAnchor?: string;
  includedDomains: string[];
  excludedDomains: string[];
  includedTypes: string[];
  excludedTypes: string[];
  party?: 'first' | 'third';
  regex: RegExp;
}

const resourceOptions = new Set(['document', 'subdocument', 'script', 'stylesheet', 'image', 'object', 'xmlhttprequest', 'xhr', 'font', 'media', 'websocket', 'ping', 'other']);
const nonDomainOptions = new Set([...resourceOptions, 'third-party', 'match-case', 'important', 'popup', 'popunder', 'generichide', 'specifichide', 'elemhide', 'object-subrequest', 'webrtc', 'empty', 'mp4', 'all']);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ruleRegex(pattern: string, domainAnchor?: string, matchCase = false): RegExp | null {
  try {
    if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
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
    if (normalized.startsWith('domain=')) {
      readingDomains = true;
      const domains = normalized.slice(7).split(/[|]/).filter(Boolean);
      for (const item of domains) {
        const isExcluded = item.startsWith('~');
        const domain = (isExcluded ? item.slice(1) : item).replace(/^\.+|\.+$/g, '');
        if (domain) (isExcluded ? excludedDomains : includedDomains).push(domain);
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
    if (normalized === 'third-party') party = negative ? 'first' : 'third';
    if (normalized === 'match-case') matchCase = true;
  }
  const regex = ruleRegex(pattern, undefined, matchCase);
  if (!regex) return null;
  const domainAnchorMatch = pattern.match(/^\|\|([^\^/*|]+)/);
  return {
    action, source: line.trim(), domainAnchor: domainAnchorMatch?.[1]?.toLowerCase(),
    includedDomains, excludedDomains, includedTypes, excludedTypes, party, regex,
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

export function decideFilterAction(rules: NetworkFilterRule[], url: string, context: FilterRequestContext): 'block' | 'allow' | 'none' {
  const matches = rules.filter((rule) => matchesFilterRule(rule, url, context));
  if (matches.some((rule) => rule.action === 'allow')) return 'allow';
  return matches.some((rule) => rule.action === 'block') ? 'block' : 'none';
}
import { getDomain } from 'tldts';

