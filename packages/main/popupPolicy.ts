export type WindowIntent = 'popup' | 'tab' | 'deny';

/**
 * OAuth and passkey flows call `window.open(url, name, 'width=…,height=…')` and
 * then finish by talking back through `window.opener`, relying on the opener's
 * cookies. Turning those into tabs breaks the handshake and the login never
 * lands in the tab that started it.
 *
 * Ordinary `target="_blank"` links carry no size features, so they keep opening
 * as tabs — which is what a browser should do.
 */
export function isSizedPopup(features: string | undefined): boolean {
  return /(?:^|,)\s*(?:width|height)\s*=/i.test(features || '');
}

export function decideWindowIntent(input: {
  url: string;
  features?: string;
  isWebUrl: boolean;
  fromShell: boolean;
}): WindowIntent {
  if (!input.isWebUrl) return 'deny';
  // The app shell is UI, never a browsing surface.
  if (input.fromShell) return 'tab';
  return isSizedPopup(input.features) ? 'popup' : 'tab';
}
