import { describe, expect, it } from 'vitest';

/**
 * @vitest-environment jsdom
 */
import { detectPlatform, shortcutForKeyboardEvent } from './shellShortcuts';

const mac = { platform: 'darwin' as const };

describe('detectPlatform', () => {
  it('recognises macOS, Windows and everything else', () => {
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('darwin');
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('win32');
    expect(detectPlatform('Mozilla/5.0 (X11; Linux x86_64)')).toBe('linux');
    expect(detectPlatform('')).toBe('linux');
  });
});

describe('shortcutForKeyboardEvent', () => {
  it('maps Cmd+T to new-tab on macOS', () => {
    expect(shortcutForKeyboardEvent({ key: 't', metaKey: true }, {}, mac)).toEqual({
      action: 'new-tab',
      params: {},
    });
  });

  it('maps Ctrl+T to new-tab on Linux', () => {
    expect(shortcutForKeyboardEvent({ key: 't', ctrlKey: true }, {}, { platform: 'linux' })).toEqual({
      action: 'new-tab',
      params: {},
    });
  });

  it('maps Cmd+W to tab.close', () => {
    expect(shortcutForKeyboardEvent({ key: 'w', metaKey: true }, {}, mac)?.action).toBe('tab.close');
  });

  it('extracts the tab index for parameterized commands', () => {
    expect(shortcutForKeyboardEvent({ key: '3', metaKey: true }, {}, mac)).toEqual({
      action: 'tab.go-to',
      params: { index: 3 },
    });
  });

  it('does not steal plain typing', () => {
    expect(shortcutForKeyboardEvent({ key: 't' }, {}, mac)).toBeNull();
    expect(shortcutForKeyboardEvent({ key: 'T', shiftKey: true }, {}, mac)).toBeNull();
  });

  it('does not match Option/special characters from non-US layouts', () => {
    expect(shortcutForKeyboardEvent({ key: 'å', altKey: true }, {}, mac)).toBeNull();
    expect(shortcutForKeyboardEvent({ key: 'Dead' }, {}, mac)).toBeNull();
  });

  it('ignores key repeats and IME composition', () => {
    expect(shortcutForKeyboardEvent({ key: 't', metaKey: true, repeat: true }, {}, mac)).toBeNull();
    expect(shortcutForKeyboardEvent({ key: 't', metaKey: true, isComposing: true }, {}, mac)).toBeNull();
  });

  it('honours user overrides and unbinding', () => {
    expect(
      shortcutForKeyboardEvent({ key: 't', metaKey: true }, { 'new-tab': ['Mod+Shift+N'] }, mac),
    ).toBeNull();
    expect(
      shortcutForKeyboardEvent({ key: 'n', metaKey: true, shiftKey: true }, { 'new-tab': ['Mod+Shift+N'] }, mac)?.action,
    ).toBe('new-tab');
    expect(
      shortcutForKeyboardEvent({ key: 't', metaKey: true }, { 'new-tab': null }, mac),
    ).toBeNull();
  });

  it('allows modifier shortcuts inside text fields but not bare keys', () => {
    const options = { ...mac, inTextField: true };
    expect(shortcutForKeyboardEvent({ key: 'w', metaKey: true }, {}, options)?.action).toBe('tab.close');
    expect(shortcutForKeyboardEvent({ key: 't' }, {}, options)).toBeNull();
    expect(shortcutForKeyboardEvent({ key: 'Escape' }, {}, options)?.action).toBe('close-overlays');
  });

  it('falls back to swapping Ctrl and Meta for legacy Ctrl+L presses', () => {
    expect(shortcutForKeyboardEvent({ key: 'l', ctrlKey: true }, {}, mac)?.action).toBe('focus-address');
  });

  it('does not throw when a real KeyboardEvent has no match (Ctrl/Meta swap path)', () => {
    // A real DOM KeyboardEvent: spreading it would lose `key` and crash.
    const event = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true });
    expect(() => shortcutForKeyboardEvent(event, {}, mac)).not.toThrow();
    expect(shortcutForKeyboardEvent(event, {}, mac)).toBeNull();
  });

  it('matches via Ctrl/Meta swap with a real KeyboardEvent', () => {
    const event = new KeyboardEvent('keydown', { key: 'l', ctrlKey: true });
    expect(shortcutForKeyboardEvent(event, {}, mac)?.action).toBe('focus-address');
  });

  it('matches normally with a real KeyboardEvent', () => {
    const event = new KeyboardEvent('keydown', { key: 't', metaKey: true });
    expect(shortcutForKeyboardEvent(event, {}, mac)?.action).toBe('new-tab');
  });

  it('returns null for real KeyboardEvent typing keys (no modifier)', () => {
    const event = new KeyboardEvent('keydown', { key: 'a' });
    expect(shortcutForKeyboardEvent(event, {}, mac)).toBeNull();
  });

  it('ignores repeats on real KeyboardEvents', () => {
    const event = new KeyboardEvent('keydown', { key: 't', metaKey: true, repeat: true });
    expect(shortcutForKeyboardEvent(event, {}, mac)).toBeNull();
  });
});
