export type EssentialsScope = 'workspace' | 'profile';

interface ScopedEssential {
  id: string;
  spaceId: string;
  profileId?: string;
  scope?: EssentialsScope;
}

export function filterEssentialsForContext<T extends ScopedEssential>(
  sites: T[], scope: EssentialsScope, spaceId: string, profileId: string,
): T[] {
  return sites.filter((site) => {
    const siteScope = site.scope || 'workspace';
    if (scope === 'profile') return siteScope === 'profile' && site.profileId === profileId;
    return siteScope === 'workspace' && site.spaceId === spaceId;
  });
}
