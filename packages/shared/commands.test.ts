import { describe, expect, it } from 'vitest';
import {
  COMMANDS,
  findCommand,
  matchBinding,
  normalizeBinding,
  parseBinding,
  commandsByCategory,
} from './commands';

describe('parseBinding', () => {
  it('parses simple modifier+key bindings', () => {
    expect(parseBinding('Mod+T')).toEqual({
      ctrl: false,
      alt: false,
      shift: false,
      mod: true,
      key: 't',
    });
  });

  it('parses multi-modifier bindings', () => {
    expect(parseBinding('Ctrl+Shift+T')).toEqual({
      ctrl: true,
      alt: false,
      shift: true,
      mod: false,
      key: 't',
    });
  });

  it('parses alt bindings', () => {
    expect(parseBinding('Alt+KeyT')).toEqual({
      ctrl: false,
      alt: true,
      shift: false,
      mod: false,
      key: 'keyt',
    });
  });

  it('handles modifier order invariance', () => {
    expect(parseBinding('Shift+Mod+T')).toEqual({
      ctrl: false,
      alt: false,
      shift: true,
      mod: true,
      key: 't',
    });
  });

  it('returns null for empty bindings', () => {
    expect(parseBinding('')).toBeNull();
    expect(parseBinding('+')).toBeNull();
    expect(parseBinding('Mod+')).toBeNull();
  });

  it('returns null for multiple keys', () => {
    expect(parseBinding('Mod+T+K')).toBeNull();
  });
});

describe('normalizeBinding', () => {
  it('maps Mod to meta on darwin', () => {
    const parsed = parseBinding('Mod+T')!;
    expect(normalizeBinding(parsed, 'darwin')).toEqual({
      ctrl: false,
      alt: false,
      shift: false,
      meta: true,
      key: 't',
    });
  });

  it('maps Mod to ctrl on win32', () => {
    const parsed = parseBinding('Mod+T')!;
    expect(normalizeBinding(parsed, 'win32')).toEqual({
      ctrl: true,
      alt: false,
      shift: false,
      meta: false,
      key: 't',
    });
  });

  it('keeps ctrl as ctrl on darwin', () => {
    const parsed = parseBinding('Ctrl+T')!;
    expect(normalizeBinding(parsed, 'darwin')).toEqual({
      ctrl: true,
      alt: false,
      shift: false,
      meta: false,
      key: 't',
    });
  });
});

describe('matchBinding', () => {
  const darwinInput = (key: string, mods: { ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean } = {}) => ({
    key,
    ctrl: mods.ctrl ?? false,
    alt: mods.alt ?? false,
    shift: mods.shift ?? false,
    meta: mods.meta ?? false,
  });

  it('matches new-tab on darwin', () => {
    expect(matchBinding(darwinInput('t', { meta: true }), 'darwin', COMMANDS, {})).toBe('new-tab');
  });

  it('matches new-tab on win32', () => {
    expect(matchBinding(darwinInput('t', { ctrl: true }), 'win32', COMMANDS, {})).toBe('new-tab');
  });

  it('matches command-bar on darwin', () => {
    expect(matchBinding(darwinInput('k', { meta: true }), 'darwin', COMMANDS, {})).toBe('command-bar');
  });

  it('matches focus-address on darwin', () => {
    expect(matchBinding(darwinInput('l', { meta: true }), 'darwin', COMMANDS, {})).toBe('focus-address');
  });

  it('matches escape without modifiers', () => {
    expect(matchBinding(darwinInput('escape'), 'darwin', COMMANDS, {})).toBe('close-overlays');
  });

  it('ignores key repeats (empty key)', () => {
    expect(matchBinding(darwinInput(''), 'darwin', COMMANDS, {})).toBeNull();
  });

  it('returns null for unbound plain key', () => {
    expect(matchBinding(darwinInput('t'), 'darwin', COMMANDS, {})).toBeNull();
  });

  it('returns null for non-matching modifier', () => {
    expect(matchBinding(darwinInput('t', { ctrl: true }), 'darwin', COMMANDS, {})).toBeNull();
  });

  it('honors overrides that unbind a command (null)', () => {
    expect(matchBinding(darwinInput('t', { meta: true }), 'darwin', COMMANDS, { 'new-tab': null })).toBeNull();
  });

  it('honors overrides that change bindings', () => {
    expect(
      matchBinding(darwinInput('n', { meta: true }), 'darwin', COMMANDS, { 'new-tab': ['Mod+N'] }),
    ).toBe('new-tab');
  });

  it('matches tab.close with Mod+W', () => {
    expect(matchBinding(darwinInput('w', { meta: true }), 'darwin', COMMANDS, {})).toBe('tab.close');
  });

  it('matches new-space with Mod+Shift+T', () => {
    expect(matchBinding(darwinInput('t', { meta: true, shift: true }), 'darwin', COMMANDS, {})).toBe(
      'new-space',
    );
  });
});

describe('registry integrity', () => {
  it('has unique command ids', () => {
    const ids = COMMANDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every command has a non-empty title', () => {
    for (const command of COMMANDS) {
      expect(command.title.trim().length).toBeGreaterThan(0);
    }
  });

  it('findCommand returns the right command', () => {
    expect(findCommand('new-tab')?.id).toBe('new-tab');
    expect(findCommand('nonexistent')).toBeUndefined();
  });

  it('commandsByCategory includes all commands', () => {
    const byCat = commandsByCategory();
    const total = Object.values(byCat).reduce((sum, arr) => sum + arr.length, 0);
    expect(total).toBe(COMMANDS.length);
  });
});
