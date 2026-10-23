const HOST_PATTERN = /^(localhost(?::\d+)?|(?:[\w-]+\.)+[a-z]{2,}(?::\d+)?)([/?#].*)?$/i;

export function resolveAddressOrSearch(value: string): string | null {
  const input = value.trim();
  if (!input) return null;
  if (/^https?:\/\//i.test(input)) return input;
  if (HOST_PATTERN.test(input)) return `https://${input}`;
  return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
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
