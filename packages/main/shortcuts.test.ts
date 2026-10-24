import { describe, expect, it } from 'vitest';
import { shortcutForInput } from './shortcuts';

const input = (overrides: Partial<Parameters<typeof shortcutForInput>[0]> = {}) => ({
  type: 'keyDown',
  key: 't',
  meta: false,
  control: false,
  shift: false,
  isAutoRepeat: false,
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
