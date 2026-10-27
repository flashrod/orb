/**
 * Tab behavior that depends on the site being viewed: the user's
 * never-hibernate list, Picture-in-Picture policy and tidier tab titles.
 *
 * Protection from hibernation is behavior-based (audio, calls, typed input,
 * notifications) and lives in `tabLifecycle.ts`. This module deliberately holds
 * no per-site memory policy and no per-site title list: the only site names it
 * knows are derived from the URL being tidied.
 *
 * No Electron or DOM imports, so both browser engines and the main process can
 * share it.
 */

export type PiPControl = 'play' | 'scrub' | 'skip' | 'close';

export interface PiPPolicy {
  /** Whether Orb may enter PiP automatically when the tab is backgrounded. */
  autoEnter: boolean;
  /** YouTube-style behavior: enter PiP once playback becomes inaudible. */
  activatesWhenInaudible: boolean;
  /** Controls the site asks Orb to hide while PiP is active. */
  disabledControls: PiPControl[];
}

const PIP_DENY_DOMAINS: readonly string[] = [
  'app.slack.com',
  'meet.google.com',
  'teams.microsoft.com',
];

interface PiPSiteConfig {
  domain: string;
  activatesWhenInaudible?: boolean;
  disabledControls?: readonly PiPControl[];
}

const PIP_SITE_CONFIGS: readonly PiPSiteConfig[] = [
  { domain: 'twitch.tv', disabledControls: ['play', 'scrub', 'skip'] },
  { domain: 'meet.google.com', disabledControls: ['close'] },
  { domain: 'youtube.com', activatesWhenInaudible: true },
  { domain: 'open.spotify.com', disabledControls: ['skip', 'scrub'] },
  { domain: 'netflix.com', disabledControls: ['skip', 'scrub'] },
];

/**
 * Separators sites put between a page title and their own name. ":" is left out
 * of the trailing set because titles use it for real content ("Show HN: Orb").
 */
const TRAILING_SEPARATORS = /\s+[-–—|·]\s+/;

/** Words that carry no brand meaning when comparing a suffix to a hostname. */
const TITLE_STOPWORDS = new Set(['the', 'and', 'of', 'a', 'an', 'com', 'org', 'net', 'io', 'co', 'app', 'web', 'www', 'en', 'open', 'mail', 'docs', 'drive', 'calendar']);

/** Notification counts sites prefix to the document title: "(3) Feed". */
const NOTIFICATION_COUNT = /^\(\d+\+?\)\s*/;

const GMAIL_ROUTE_LABELS: Readonly<Record<string, string>> = {
  inbox: 'Gmail',
  starred: 'Starred',
  snoozed: 'Snoozed',
  sent: 'Sent',
  drafts: 'Drafts',
  spam: 'Spam',
  trash: 'Trash',
  imp: 'Important',
  important: 'Important',
  all: 'All Mail',
};

function parseWebUrl(input: string): URL | null {
  try {
    const url = new URL(input);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function canonicalHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
}

function hostIs(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function collapse(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

// ------------------------------------------------------- never-hibernate list

/**
 * Turns what a user typed into a hostname to match, or null when it is not a
 * usable site. Accepts bare domains and pasted URLs; paths and queries are
 * dropped because hibernation is decided per site.
 */
export function normalizeNeverHibernateEntry(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = parseWebUrl(candidate);
  if (!parsed) return null;
  const host = canonicalHost(parsed.hostname);
  return host.includes('.') ? host : null;
}

/** True when the tab's site is on the user's never-hibernate list. */
export function isNeverHibernate(url: string, list: readonly string[]): boolean {
  if (list.length === 0) return false;
  const parsed = parseWebUrl(url);
  if (!parsed) return false;
  const host = canonicalHost(parsed.hostname);
  return list.some((entry) => {
    const domain = normalizeNeverHibernateEntry(entry);
    return domain !== null && hostIs(host, domain);
  });
}

// --------------------------------------------------- picture-in-picture policy

/** Returns the PiP behavior Orb should apply on a site. */
export function pipPolicyFor(url: string): PiPPolicy {
  const policy: PiPPolicy = {
    autoEnter: true,
    activatesWhenInaudible: false,
    disabledControls: [],
  };
  const parsed = parseWebUrl(url);
  if (!parsed) return policy;

  const host = canonicalHost(parsed.hostname);
  if (PIP_DENY_DOMAINS.some((domain) => hostIs(host, domain))) policy.autoEnter = false;

  const config = PIP_SITE_CONFIGS.find((candidate) => hostIs(host, candidate.domain));
  if (config?.activatesWhenInaudible) policy.activatesWhenInaudible = true;
  if (config?.disabledControls) policy.disabledControls = [...config.disabledControls];
  return policy;
}

// ---------------------------------------------------------------- tidy titles

/**
 * Removes noise from a page title for display in the tab strip and command
 * bar. The stored title is left untouched so search and session restore keep
 * the full value.
 */
export function tidyTitle(url: string, rawTitle: string): string {
  const title = collapse(rawTitle);
  const parsed = parseWebUrl(url);
  if (!parsed) return title;

  const host = canonicalHost(parsed.hostname);
  if (host === 'mail.google.com') return tidyGmailTitle(parsed, title);
  if (host === 'calendar.google.com') return tidyCalendarTitle(parsed, title);

  let next = title.replace(NOTIFICATION_COUNT, '').trim();
  if (host === 'github.com') next = tidyGithubTitle(next);
  next = stripRedundantSiteName(next, host);

  return collapse(next) || title;
}

/**
 * One generic rule instead of a per-site list: drop a leading or trailing
 * segment when every meaningful word in it also appears in the hostname.
 *
 * "Never Gonna Give You Up - YouTube" on youtube.com loses "YouTube";
 * "Show HN: Orb | Hacker News" on news.ycombinator.com keeps its suffix because
 * "hacker" is not part of the host. That is the deliberate tradeoff: a site
 * whose brand is not derivable from its hostname keeps its suffix rather than
 * being added to a hand-maintained table.
 */
function stripRedundantSiteName(title: string, host: string): string {
  const hostWords = hostnameWords(host);

  const trailing = lastMatch(title, TRAILING_SEPARATORS);
  if (trailing) {
    const [head, tail] = [title.slice(0, trailing.index), title.slice(trailing.index + trailing[0].length)];
    if (isSiteName(tail, hostWords) && head.trim()) return head.trim();
  }

  const prefix = /^([^:]{1,40}):\s+(.+)$/.exec(title);
  if (prefix && isSiteName(prefix[1], hostWords)) return prefix[2].trim();

  return title;
}

function lastMatch(value: string, pattern: RegExp): RegExpExecArray | null {
  const global = new RegExp(pattern.source, 'g');
  let match: RegExpExecArray | null = null;
  let next = global.exec(value);
  while (next) {
    match = next;
    next = global.exec(value);
  }
  return match;
}

/** Every meaningful word the hostname can contribute to a brand name. */
function hostnameWords(host: string): Set<string> {
  const words = new Set<string>();
  for (const label of host.split('.')) {
    if (label.length < 2) continue;
    words.add(label);
    for (const part of label.split('-')) {
      if (part.length >= 2) words.add(part);
    }
  }
  return words;
}

/** True when every meaningful word in `segment` is explained by the hostname. */
function isSiteName(segment: string, hostWords: Set<string>): boolean {
  const words = segment
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((word) => !TITLE_STOPWORDS.has(word));
  if (words.length === 0 || words.length > 3) return false;
  return words.every((word) => hostWords.has(word));
}

function tidyGmailTitle(url: URL, title: string): string {
  const hash = url.hash.replace(/^#/, '');
  const [route, ...rest] = hash.split('/');
  if (route === 'label' && rest[0]) return decodeURIComponent(rest[0]);
  const label = GMAIL_ROUTE_LABELS[route.toLowerCase()];
  if (label) return label;

  return collapse(
    title
      .replace(NOTIFICATION_COUNT, '')
      .replace(/ - [^\s]+@[^\s]+ - Gmail$/, '')
      .replace(/ - Gmail$/, ''),
  ) || 'Gmail';
}

function tidyCalendarTitle(url: URL, title: string): string {
  const segments = [
    ...url.pathname.toLowerCase().split('/'),
    ...url.hash.replace(/^#/, '').toLowerCase().split('/'),
  ];
  if (segments.includes('agenda')) return 'Schedule';
  if (segments.some((segment) => segment === 'week' || segment === 'month' || segment === 'day' || segment === 'year')) {
    return 'Calendar';
  }
  return collapse(title.replace(/ - Google Calendar$/, '')) || 'Calendar';
}

function tidyGithubTitle(title: string): string {
  return collapse(title.replace(/ by [^·]+(?= · )/, ''));
}
