import { describe, expect, it } from 'vitest';
import { resolveAddressOrSearch } from './navigation';

describe('address and search resolution', () => {
  it('sends plain-language queries to the chosen provider', () => {
    expect(resolveAddressOrSearch('quiet reading spaces', 'duckduckgo')).toBe('https://duckduckgo.com/?q=quiet%20reading%20spaces');
    expect(resolveAddressOrSearch('quiet reading spaces', 'brave')).toBe('https://search.brave.com/search?q=quiet%20reading%20spaces');
  });

  it('encodes Unicode search terms and defaults older callers to Google', () => {
    expect(resolveAddressOrSearch('café', 'bing')).toBe('https://www.bing.com/search?q=caf%C3%A9');
    expect(resolveAddressOrSearch('café')).toBe('https://www.google.com/search?q=caf%C3%A9');
  });

  it('keeps explicitly entered URLs and hostnames as navigation targets', () => {
    expect(resolveAddressOrSearch('https://example.com/a')).toBe('https://example.com/a');
    expect(resolveAddressOrSearch('example.com')).toBe('https://example.com');
  });

  it('does not navigate empty or whitespace-only input', () => {
    expect(resolveAddressOrSearch('   ')).toBeNull();
  });
});
