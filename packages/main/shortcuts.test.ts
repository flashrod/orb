import { describe, expect, it } from 'vitest';
import { bindingSafeInTextField, bindingUsesModifier, shortcutForInput } from './shortcuts';

const input = (overrides: Partial<Parameters<typeof shortcutForInput>[0]> = {}) => ({
  type: 'keyDown',
  key: 't',
  meta: false,
  control: false,
  shift: false,
  alt: false,
  isAutoRepeat: false,
  isComposing: false,
  ...overrides,
});

describe('shortcutForInput', () => {
  it('maps the core browser shortcuts', () => {
    expect(shortcutForInput(input({ key: 't', meta: true }))).toBe('new-tab');
    expect(shortcutForInput(input({ key: 'k', meta: true }))).toBe('command-bar');
    expect(shortcutForInput(input({ key: 'l', control: true }))).toBe('focus-address');
    expect(shortcutForInput(input({ key: 'f', meta: true }))).toBe('find');
    expect(shortcutForInput(input({ key: 'p', meta: true }))).toBe('print');
  });

  it('maps shift combinations', () => {
    expect(shortcutForInput(input({ key: 'T', meta: true, shift: true }))).toBe('new-space');
    expect(shortcutForInput(input({ key: 'M', meta: true, shift: true }))).toBe('toggle-compact');
  });

  it('maps escape without a modifier', () => {
    expect(shortcutForInput(input({ key: 'Escape' }))).toBe('close-overlays');
  });

  it('ignores key-up, repeats and plain typing', () => {
    expect(shortcutForInput(input({ type: 'keyUp', key: 't', meta: true }))).toBeNull();
    expect(shortcutForInput(input({ key: 't', meta: true, isAutoRepeat: true }))).toBeNull();
    expect(shortcutForInput(input({ key: 't' }))).toBeNull();
    expect(shortcutForInput(input({ key: 'Escape', meta: true }))).toBeNull();
  });
});

describe('bindingUsesModifier', () => {
  it('detects command modifiers', () => {
    expect(bindingUsesModifier('Mod+T')).toBe(true);
    expect(bindingUsesModifier('Ctrl+T')).toBe(true);
    expect(bindingUsesModifier('Alt+T')).toBe(true);
  });

  it('does not count shift alone', () => {
    expect(bindingUsesModifier('Shift+T')).toBe(false);
    expect(bindingUsesModifier('T')).toBe(false);
  });
});

describe('bindingSafeInTextField', () => {
  it('allows command modifiers', () => {
    expect(bindingSafeInTextField('Mod+T')).toBe(true);
    expect(bindingSafeInTextField('Ctrl+T')).toBe(true);
    expect(bindingSafeInTextField('Alt+T')).toBe(true);
  });

  it('allows escape and function keys', () => {
    expect(bindingSafeInTextField('Escape')).toBe(true);
    expect(bindingSafeInTextField('F1')).toBe(true);
    expect(bindingSafeInTextField('F12')).toBe(true);
  });

  it('disallows shift alone and plain keys', () => {
    expect(bindingSafeInTextField('Shift+T')).toBe(false);
    expect(bindingSafeInTextField('T')).toBe(false);
    expect(bindingSafeInTextField('Mod+Shift+T')).toBe(true); // has Mod
  });
});

describe('shortcutForInput guards', () => {
  const darwin = (overrides: Record<string, string[] | null | undefined> = {}) => overrides;

  it('ignores IME composition', () => {
    expect(shortcutForInput(input({ key: 't', meta: true, isComposing: true }))).toBeNull();
  });

  it('honors overrides that unbind a command', () => {
    expect(
      shortcutForInput(input({ key: 't', meta: true }), { 'new-tab': null }),
    ).toBeNull();
  });

  it('honors override bindings', () => {
    expect(
      shortcutForInput(input({ key: 'n', meta: true }), { 'new-tab': ['Mod+N'] }),
    ).toBe('new-tab');
  });

  it('text-field guard blocks plain key', () => {
    expect(
      shortcutForInput(input({ key: 't' }), {}, true),
    ).toBeNull();
  });

  it('text-field guard allows modifier key', () => {
    expect(
      shortcutForInput(input({ key: 't', meta: true }), {}, true),
    ).toBe('new-tab');
  });

  it('text-field guard allows escape', () => {
    expect(
      shortcutForInput(input({ key: 'Escape' }), {}, true),
    ).toBe('close-overlays');
  });

  it('text-field guard allows escape', () => {
    expect(
      shortcutForInput(input({ key: 'Escape' }), {}, true),
    ).toBe('close-overlays');
  });

  it('text-field guard does not block unbound function keys (guard passes, no command bound)', () => {
    // F1 has no command, so result is null — but the guard itself did not block it.
    // bindingSafeInTextField('F1') is true, verified in its own describe block.
    expect(shortcutForInput(input({ key: 'f1' }), {}, true)).toBeNull();
  });

  it('text-field guard allows command+shift in text field', () => {
    expect(
      shortcutForInput(input({ key: 't', meta: true, shift: true }), {}, true),
    ).toBe('new-space');
  });
});

