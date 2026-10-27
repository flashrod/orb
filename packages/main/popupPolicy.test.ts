import { describe, expect, it } from 'vitest';
import { decideWindowIntent, isSizedPopup } from './popupPolicy';

const web = (features?: string, fromShell = false) =>
  decideWindowIntent({ url: 'https://accounts.google.com/o/oauth2/auth', features, isWebUrl: true, fromShell });

describe('window open policy', () => {
  it('treats a sized window.open as an auth popup', () => {
    expect(isSizedPopup('width=500,height=600')).toBe(true);
    expect(isSizedPopup('popup,width=420,height=640,left=10')).toBe(true);
    expect(isSizedPopup('height=700')).toBe(true);
    expect(web('width=500,height=600')).toBe('popup');
  });

  it('keeps plain target=_blank links as tabs', () => {
    expect(isSizedPopup(undefined)).toBe(false);
    expect(isSizedPopup('')).toBe(false);
    expect(isSizedPopup('noopener,noreferrer')).toBe(false);
    expect(web()).toBe('tab');
    expect(web('noopener')).toBe('tab');
  });

  it('never lets the app shell open a native window', () => {
    expect(web('width=500,height=600', true)).toBe('tab');
  });

  it('refuses non-web targets', () => {
    expect(decideWindowIntent({ url: 'file:///etc/passwd', isWebUrl: false, fromShell: false })).toBe('deny');
  });

  it('does not mistake a size-like word for a dimension', () => {
    expect(isSizedPopup('widthx=500')).toBe(false);
    expect(isSizedPopup('popupwidth=500')).toBe(false);
  });
});
