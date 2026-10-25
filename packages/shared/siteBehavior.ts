/**
 * Per-site behavior for tabs: keepalive, suspension exemptions, PiP policy and
 * tidier tab titles.
 *
 * The domains and title shapes are informed by Arc's web-content behavior, but
 * this module is an independent implementation with plain, testable data. It
 * has no Electron or DOM imports so both browser engines and the main process
 * can share it.
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

interface KeepaliveRule {
  domain: string;
  /** Optional path prefix; omit to protect the whole domain. */
  path?: string;
}

/**
 * Tabs on these sites keep their renderer alive even when backgrounded.
 * They are either communication surfaces (mail, chat, calls) or long-running
 * editors where a cold reload loses real state.
 */
const KEEPALIVE_RULES: readonly KeepaliveRule[] = [
  { domain: 'x.com' },
  { domain: 'twitter.com' },
  { domain: 'app.slack.com', path: '/client' },
  { domain: 'mail.google.com', path: '/mail' },
  { domain: 'calendar.google.com', path: '/calendar' },
  { domain: 'notion.so' },
  { domain: 'notion.site' },
  { domain: 'app.notion.com' },
  { domain: 'dropbox.com' },
  { domain: 'aws.amazon.com' },
  { domain: 'open.spotify.com' },
  { domain: 'linear.app' },
  { domain: 'instagram.com' },
  { domain: 'messenger.com' },
  { domain: 'facebook.com' },
  { domain: 'web.whatsapp.com' },
  { domain: 'sentry.io' },
  { domain: 'figma.com', path: '/file/' },
  { domain: 'docs.google.com', path: '/document' },
  { domain: 'docs.google.com', path: '/presentation' },
  { domain: 'docs.google.com', path: '/spreadsheets' },
  { domain: 'outlook.live.com', path: '/mail' },
  { domain: 'outlook.live.com', path: '/calendar' },
];

/** Workspaces that should never be suspended, matching Arc's Notion rule. */
const SUSPENSION_EXEMPT_DOMAINS: readonly string[] = [
  'notion.so',
  'notion.site',
  'app.notion.com',
];

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

interface TitleRule {
  domains: readonly string[];
  patterns: readonly RegExp[];
}

/**
 * Suffix/prefix cleanup for sites whose titles are noisy by default. Rules are
 * applied in order and only to the matching host.
 */
const TITLE_RULES: readonly TitleRule[] = [
  { domains: ['youtube.com'], patterns: [/ - YouTube$/] },
  { domains: ['linkedin.com'], patterns: [/^\(\d+\+?\)\s*/, / \| LinkedIn$/] },
  { domains: ['news.ycombinator.com'], patterns: [/ \| Hacker News$/] },
  { domains: ['figma.com'], patterns: [/ [–-] Figma$/] },
  { domains: ['notion.so', 'notion.site', 'app.notion.com'], patterns: [/^\(\d+\+?\)\s*/, / \| Notion$/] },
  { domains: ['amazon.com'], patterns: [/^Amazon\.com\s*:\s*/, / : Amazon\.com$/] },
  { domains: ['netflix.com'], patterns: [/ - Netflix$/] },
  { domains: ['open.spotify.com'], patterns: [/ - song and lyrics by .*$/, / \| Spotify$/] },
  { domains: ['web.whatsapp.com'], patterns: [/ - WhatsApp$/] },
  { domains: ['wikipedia.org'], patterns: [/ - Wikipedia$/] },
  { domains: ['nytimes.com'], patterns: [/ - The New York Times$/] },
  { domains: ['docs.google.com'], patterns: [/ - Google Docs$/, / - Google Sheets$/, / - Google Slides$/] },
  { domains: ['drive.google.com'], patterns: [/ - Google Drive$/] },
  { domains: ['zillow.com'], patterns: [/ \| Zillow$/] },
];

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

function pathHasPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`);
}

function collapse(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** True when a tab is a communication/editor surface that must stay loaded. */
export function isKeepalive(url: string): boolean {
  const parsed = parseWebUrl(url);
  if (!parsed) return false;
  const host = canonicalHost(parsed.hostname);
  return KEEPALIVE_RULES.some((rule) =>
    hostIs(host, rule.domain) && (!rule.path || pathHasPrefix(parsed.pathname, rule.path)),
  );
}

/** True when a site should never be suspended. */
export function isSuspensionExempt(url: string): boolean {
  const parsed = parseWebUrl(url);
  if (!parsed) return false;
  const host = canonicalHost(parsed.hostname);
  return SUSPENSION_EXEMPT_DOMAINS.some((domain) => hostIs(host, domain));
}

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
  if (host === 'github.com') return tidyGithubTitle(title);

  for (const rule of TITLE_RULES) {
    if (!rule.domains.some((domain) => hostIs(host, domain))) continue;
    let next = title;
    for (const pattern of rule.patterns) next = next.replace(pattern, '');
    return collapse(next) || title;
  }

  return title;
}

function tidyGmailTitle(url: URL, title: string): string {
  const hash = url.hash.replace(/^#/, '');
  const [route, ...rest] = hash.split('/');
  if (route === 'label' && rest[0]) return decodeURIComponent(rest[0]);
  const label = GMAIL_ROUTE_LABELS[route.toLowerCase()];
  if (label) return label;

  return collapse(
    title
      .replace(/^\(\d+\+?\)\s*/, '')
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
