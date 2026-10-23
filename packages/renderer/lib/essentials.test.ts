import { describe, expect, it } from 'vitest';
import { filterEssentialsForContext } from './essentials';

const sites = [
  { id: 'workspace-a', spaceId: 'a', profileId: 'school', scope: 'workspace' as const },
  { id: 'workspace-b', spaceId: 'b', profileId: 'school', scope: 'workspace' as const },
  { id: 'profile-school', spaceId: 'a', profileId: 'school', scope: 'profile' as const },
  { id: 'profile-personal', spaceId: 'a', profileId: 'personal', scope: 'profile' as const },
  { id: 'legacy', spaceId: 'a' },
];

describe('Essentials scope', () => {
  it('shows workspace pins only in that workspace', () => {
    expect(filterEssentialsForContext(sites, 'workspace', 'a', 'school').map((site) => site.id)).toEqual(['workspace-a', 'legacy']);
  });

  it('shows profile pins across workspaces in that profile', () => {
    expect(filterEssentialsForContext(sites, 'profile', 'b', 'school').map((site) => site.id)).toEqual(['profile-school']);
  });
});
