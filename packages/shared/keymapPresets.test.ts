import { describe, expect, it } from 'vitest';
import { getPreset, listPresets, presetOverrides } from './keymapPresets';

describe('keymap presets', () => {
  it('lists Chrome, Safari, and Arc presets', () => {
    const ids = listPresets().map((p) => p.id);
    expect(ids).toContain('chrome');
    expect(ids).toContain('safari');
    expect(ids).toContain('arc');
  });

  it('chrome preset rebinds reopen-closed to Mod+Shift+T', () => {
    const preset = getPreset('chrome');
    expect(preset).toBeDefined();
    expect(preset!.overrides['tab.reopen-closed']).toEqual(['Mod+Shift+T']);
  });

  it('safari preset rebinds reopen-closed to Mod+Z', () => {
    const preset = getPreset('safari');
    expect(preset).toBeDefined();
    expect(preset!.overrides['tab.reopen-closed']).toEqual(['Mod+Z']);
  });

  it('arc preset binds spaces to Mod+1..5 and unbinds go-to', () => {
    const preset = getPreset('arc');
    expect(preset).toBeDefined();
    expect(preset!.overrides['space.switch']).toEqual(['Mod+1', 'Mod+2', 'Mod+3', 'Mod+4', 'Mod+5']);
    expect(preset!.overrides['tab.go-to']).toEqual([]);
  });

  it('presetOverrides returns a copy, not the live record', () => {
    const overrides = presetOverrides('chrome')!;
    overrides['tab.reopen-closed'] = ['Mod+X'];
    const again = presetOverrides('chrome')!;
    expect(again['tab.reopen-closed']).toEqual(['Mod+Shift+T']);
  });

  it('returns null for an unknown preset id', () => {
    expect(getPreset('nope')).toBeUndefined();
    expect(presetOverrides('nope')).toBeNull();
  });
});
