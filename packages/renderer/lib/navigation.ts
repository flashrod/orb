const HOST_PATTERN = /^(localhost(?::\d+)?|(?:[\w-]+\.)+[a-z]{2,}(?::\d+)?)([/?#].*)?$/i;

export type SearchProvider = 'google' | 'duckduckgo' | 'bing' | 'brave' | 'startpage';

export const SEARCH_PROVIDERS: { id: SearchProvider; name: string; template: string }[] = [
  { id: 'google', name: 'Google', template: 'https://www.google.com/search?q={query}' },
  { id: 'duckduckgo', name: 'DuckDuckGo', template: 'https://duckduckgo.com/?q={query}' },
  { id: 'bing', name: 'Bing', template: 'https://www.bing.com/search?q={query}' },
  { id: 'brave', name: 'Brave Search', template: 'https://search.brave.com/search?q={query}' },
  { id: 'startpage', name: 'Startpage', template: 'https://www.startpage.com/sp/search?query={query}' },
];

export function resolveAddressOrSearch(value: string, provider: SearchProvider = 'google'): string | null {
  const input = value.trim();
  if (!input) return null;
  if (/^https?:\/\//i.test(input)) return input;
  if (HOST_PATTERN.test(input)) return `https://${input}`;
  const template = SEARCH_PROVIDERS.find((item) => item.id === provider)?.template || SEARCH_PROVIDERS[0].template;
  return template.replace('{query}', encodeURIComponent(input));
}

export function resolveWebsiteAddress(value: string): string | null {
  const input = value.trim();
  if (!input) return null;
  const candidate = /^https?:\/\//i.test(input) ? input : HOST_PATTERN.test(input) ? `https://${input}` : '';
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname ? url.toString() : null;
  } catch {
    return null;
  }
}
