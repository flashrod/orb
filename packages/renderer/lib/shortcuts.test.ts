import { describe, expect, it } from 'vitest';

/**
 * Maps keyboard shortcuts to Orb actions.
 * Returns the action name or null if unhandled.
 */
function shortcutToAction(key: string, metaKey: boolean, ctrlKey: boolean, shiftKey: boolean): string | null {
  // Cmd+T / Ctrl+T → New Tab
  if ((metaKey || ctrlKey) && key === 't' && !shiftKey) return 'new-tab';
  // Cmd+K / Ctrl+K → Command Bar
  if ((metaKey || ctrlKey) && key === 'k' && !shiftKey) return 'command-bar';
  // Cmd+L / Ctrl+L → Focus address bar
  if ((metaKey || ctrlKey) && key === 'l' && !shiftKey) return 'focus-address';
  // Cmd+Shift+M / Ctrl+Shift+M → Compact mode toggle
  if ((metaKey || ctrlKey) && shiftKey && key.toLowerCase() === 'm') return 'toggle-compact';
  // Esc → Close overlays
  if (key === 'Escape' && !metaKey && !ctrlKey && !shiftKey) return 'close-overlays';
  return null;
}

describe('global keyboard shortcuts', () => {
  it('maps Cmd+T to new-tab', () => {
    expect(shortcutToAction('t', true, false, false)).toBe('new-tab');
    expect(shortcutToAction('t', false, true, false)).toBe('new-tab');
  });

  it('maps Cmd+K to command-bar', () => {
    expect(shortcutToAction('k', true, false, false)).toBe('command-bar');
  });

  it('maps Cmd+L to focus-address', () => {
    expect(shortcutToAction('l', true, false, false)).toBe('focus-address');
  });

  it('maps Cmd+Shift+M to toggle-compact', () => {
    expect(shortcutToAction('m', true, false, true)).toBe('toggle-compact');
  });

  it('maps Escape to close-overlays', () => {
    expect(shortcutToAction('Escape', false, false, false)).toBe('close-overlays');
  });

  it('returns null for unhandled keys', () => {
    expect(shortcutToAction('a', true, false, false)).toBeNull();
    expect(shortcutToAction('t', false, false, true)).toBeNull(); // Shift+T, not Cmd+T
  });
});
