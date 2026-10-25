/**
 * Command-bar tab deduplication policy.
 *
 * Deduplicating every host hides genuinely different tabs (two Google Docs,
 * two GitHub PRs). Match Arc's narrower behavior: only collapse hosts where
 * the extra tabs are usually redundant views of the same workspace.
 */

const DEDUP_BY_HOST = new Set([
  'figma.com',
  'maps.google.com',
  'notion.so',
  'app.notion.com',
  'zoom.us',
  'opentable.com',
  'zillow.com',
  'github.com',
  'app.mode.com',
  'console.cloud.google.com',
]);

export function dedupHostKey(host: string): string {
  return host.toLowerCase().replace(/^www\./, '');
}

export function shouldDedupByHost(host: string): boolean {
  return DEDUP_BY_HOST.has(dedupHostKey(host));
}
