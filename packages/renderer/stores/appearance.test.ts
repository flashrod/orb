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
    expect(migrateAppearanceSettings({ showStartPage: false }, 4).showStartPage).toBe(false);
  });
});
