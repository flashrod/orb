import { describe, expect, it } from 'vitest';
import { defaultBrowserHelp, defaultBrowserSettingsUrl } from './defaultBrowser';

describe('default browser guidance', () => {
  it('points macOS at Desktop & Dock', () => {
    expect(defaultBrowserHelp('darwin')).toContain('Desktop & Dock');
    expect(defaultBrowserSettingsUrl('darwin')).toBe('x-apple.systempreferences:com.apple.Desktop-Settings.extension');
  });

  it('points Windows at Default apps', () => {
    expect(defaultBrowserHelp('win32')).toContain('Default apps');
    expect(defaultBrowserSettingsUrl('win32')).toBe('ms-settings:defaultapps');
  });

  it('falls back to desktop settings on Linux', () => {
    expect(defaultBrowserHelp('linux')).toContain('desktop environment');
    expect(defaultBrowserSettingsUrl('linux')).toBeNull();
  });
});
