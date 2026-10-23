import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE, migrateProfiles, profilePartition, resolveSpaceProfile } from './profiles';

describe('browser profiles', () => {
  it('uses persistent isolated session partitions for distinct profiles', () => {
    expect(profilePartition('default')).toBe('persist:orb');
    expect(profilePartition('school')).toBe('persist:orb-profile-school');
    expect(profilePartition('personal')).not.toBe(profilePartition('school'));
  });

  it('normalizes unsafe profile IDs before using them in a partition name', () => {
    expect(profilePartition('  School / 2026  ')).toBe('persist:orb-profile-school---2026');
  });

  it('provides a default profile when migrating empty or malformed data', () => {
    expect(migrateProfiles(null)).toEqual([DEFAULT_PROFILE]);
    expect(migrateProfiles([{ id: 3, name: 'bad' }])).toEqual([DEFAULT_PROFILE]);
  });

  it('resolves removed workspace profile references to the first available profile', () => {
    expect(resolveSpaceProfile('deleted', [{ ...DEFAULT_PROFILE, id: 'one' }]).id).toBe('one');
  });
});
