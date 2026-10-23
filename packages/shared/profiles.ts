export interface ProfileSummary {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export const DEFAULT_PROFILE: ProfileSummary = {
  id: 'default',
  name: 'Personal',
  color: '#a0522d',
  createdAt: 0,
};

export function profilePartition(profileId: string): string {
  if (profileId === 'default') return 'persist:orb';
  const safeId = profileId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 80) || 'default';
  return `persist:orb-profile-${safeId}`;
}

export function migrateProfiles(value: unknown): ProfileSummary[] {
  if (!Array.isArray(value)) return [{ ...DEFAULT_PROFILE }];
  const profiles = value.filter((item): item is ProfileSummary => Boolean(
    item && typeof item === 'object' &&
    typeof (item as ProfileSummary).id === 'string' &&
    typeof (item as ProfileSummary).name === 'string'
  )).map((profile) => ({
    id: profile.id.slice(0, 96),
    name: profile.name.trim().slice(0, 48) || 'Profile',
    color: /^#[0-9a-f]{6}$/i.test(profile.color) ? profile.color : DEFAULT_PROFILE.color,
    createdAt: Number.isFinite(profile.createdAt) ? profile.createdAt : Date.now(),
  }));
  const withDefault = profiles.some((profile) => profile.id === DEFAULT_PROFILE.id)
    ? profiles
    : [{ ...DEFAULT_PROFILE }, ...profiles];
  return withDefault.length > 0 ? withDefault : [{ ...DEFAULT_PROFILE }];
}

export function resolveSpaceProfile(profileId: string | undefined, profiles: ProfileSummary[]): ProfileSummary {
  return profiles.find((profile) => profile.id === profileId) || profiles[0] || DEFAULT_PROFILE;
}
