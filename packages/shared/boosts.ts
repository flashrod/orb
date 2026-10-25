export interface BoostRecord {
  id: string;
  domain: string;
  css: string;
  js: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export type NewBoost = Omit<BoostRecord, 'createdAt' | 'updatedAt'> & Partial<Pick<BoostRecord, 'createdAt' | 'updatedAt'>>;

/**
 * A Boost for `example.com` applies to the bare domain and its subdomains.
 * `*.example.com` is treated the same way, so moving a site between `www` and
 * the apex does not silently disable its Boost.
 */
export function boostMatchesDomain(boostDomain: string, hostname: string): boolean {
  const pattern = boostDomain.trim().toLowerCase().replace(/^www\./, '').replace(/^\*\./, '');
  const host = hostname.trim().toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  if (!pattern || !host) return false;
  return host === pattern || host.endsWith(`.${pattern}`);
}

/**
 * Picks the most specific Boost for a host. An exact `mail.example.com` rule
 * wins over a broader `example.com` rule.
 */
export function bestBoostForDomain<T extends { domain: string }>(boosts: readonly T[], hostname: string): T | undefined {
  return boosts
    .filter((boost) => boostMatchesDomain(boost.domain, hostname))
    .sort((a, b) => b.domain.replace(/^\*\./, '').length - a.domain.replace(/^\*\./, '').length)[0];
}
