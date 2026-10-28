import { describe, expect, it, beforeEach } from 'vitest';
import './test-localStorage';
import { useBrowserPreferencesStore } from './preferences';

function resetStore() {
  useBrowserPreferencesStore.setState({
    searchProvider: 'google',
    essentialsScope: 'workspace',
    displayName: '',
    neverHibernate: [],
    mutedSites: [],
    showRecentSites: true,
    startupBehavior: 'ask',
    keymapOverrides: {},
    keymapPreset: null,
  });
}

describe('preferences — keymap presets', () => {
  beforeEach(() => {
    resetStore();
  });

  it('applying a preset writes its overrides and records the preset id', () => {
    const store = useBrowserPreferencesStore.getState();
    store.setKeymapPreset('arc');

    const state = useBrowserPreferencesStore.getState();
    expect(state.keymapPreset).toBe('arc');
    expect(state.keymapOverrides['space.switch']).toEqual(['Mod+1', 'Mod+2', 'Mod+3', 'Mod+4', 'Mod+5']);
    expect(state.keymapOverrides['tab.go-to']).toEqual([]);
  });

  it('applying chrome preset rebinds reopen-closed to Mod+Shift+T', () => {
    const store = useBrowserPreferencesStore.getState();
    store.setKeymapPreset('chrome');

    const state = useBrowserPreferencesStore.getState();
    expect(state.keymapPreset).toBe('chrome');
    expect(state.keymapOverrides['tab.reopen-closed']).toEqual(['Mod+Shift+T']);
  });

  it('passing default or null clears the preset without touching overrides', () => {
    const store = useBrowserPreferencesStore.getState();
    store.setKeymapOverride('tab.reopen-closed', ['Mod+Shift+T']);
    store.setKeymapPreset('arc');
    store.setKeymapPreset(null);

    const state = useBrowserPreferencesStore.getState();
    expect(state.keymapPreset).toBeNull();
    // Overrides are preserved when clearing the preset selection.
    expect(state.keymapOverrides['tab.reopen-closed']).toEqual(['Mod+Shift+T']);
  });

  it('unknown preset id clears the preset selection', () => {
    const store = useBrowserPreferencesStore.getState();
    store.setKeymapPreset('nope');

    const state = useBrowserPreferencesStore.getState();
    expect(state.keymapPreset).toBeNull();
  });

  it('resetKeymap clears overrides and preset', () => {
    const store = useBrowserPreferencesStore.getState();
    store.setKeymapPreset('safari');
    store.resetKeymap();

    const state = useBrowserPreferencesStore.getState();
    expect(state.keymapOverrides).toEqual({});
    expect(state.keymapPreset).toBeNull();
  });
});
