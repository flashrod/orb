import { describe, expect, it } from 'vitest';
import { migrateAppearanceSettings } from './appearance';

describe('appearance migrations', () => {
  it('defaults existing profiles to the Essentials homepage when upgrading', () => {
    expect(migrateAppearanceSettings({ density: 'compact' }, 3)).toMatchObject({
      density: 'compact',
      showStartPage: true,
    });
  });

  it('preserves a homepage choice on the current schema', () => {
    expect(migrateAppearanceSettings({ showStartPage: false }, 4)).toMatchObject({
      showStartPage: false,
      showTabStrip: true,
      showNavigation: true,
      compactMode: false,
    });
  });

  it('does not replay onboarding for people already using Orb', () => {
    expect(migrateAppearanceSettings({ theme: 'night' }, 6)).toMatchObject({
      theme: 'night',
      onboardingComplete: true,
    });
  });

  it('keeps a completed tour complete on the current schema', () => {
    expect(migrateAppearanceSettings({ onboardingComplete: false }, 7)).toMatchObject({
      onboardingComplete: false,
    });
  });
});
