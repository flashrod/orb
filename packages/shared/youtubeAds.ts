/**
 * YouTube's player asks for ads in the same JSON it uses for the video itself.
 * uBlock Origin deals with that by pruning the ad fields before the player
 * reads them; an extension cannot do that here (Electron never delivers
 * `chrome.webRequest` events to extensions), so Orb does it in the page.
 *
 * The script below runs in the page's main world before YouTube's own scripts,
 * which is the only point where the initial player response can be intercepted.
 * Everything is defensive: if YouTube changes shape, the page still plays.
 */
export function installYouTubeAdBlock(): void {
  const AD_KEYS = ['adPlacements', 'playerAds', 'adSlots', 'adBreakHeartbeatParams'];

  const pruneTop = (value: unknown): unknown => {
    if (!value || typeof value !== 'object') return value;
    const record = value as Record<string, unknown>;
    for (const key of AD_KEYS) {
      if (key in record) {
        try {
          delete record[key];
        } catch {
          // Frozen response: leave it alone rather than break playback.
        }
      }
    }
    return value;
  };

  // `/youtubei/v1/get_watch` (used when you click another video) carries the
  // player response inside its payload, so the ad fields can be deeper than
  // the top level. Depth is capped to keep this cheap on large payloads.
  const prune = (value: unknown, depth = 0): unknown => {
    if (!value || typeof value !== 'object' || depth > 12) return value;
    if (Array.isArray(value)) {
      for (const item of value) prune(item, depth + 1);
      return value;
    }
    const record = pruneTop(value) as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      const child = record[key];
      if (child && typeof child === 'object') prune(child, depth + 1);
    }
    return value;
  };

  // Later player requests (next video, autoplay) arrive as JSON.
  const parse = JSON.parse;
  JSON.parse = function patchedParse(this: typeof JSON, text: string, reviver?: (key: string, value: unknown) => unknown) {
    return pruneTop(parse.call(this, text, reviver));
  } as typeof JSON.parse;

  // The first video's response is an object literal in the page, not JSON, so
  // catch it on the global before the inline script assigns it.
  let initial: unknown;
  try {
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      configurable: true,
      enumerable: true,
      get() {
        return initial;
      },
      set(value: unknown) {
        initial = prune(value);
      },
    });
  } catch {
    // Older pages assign a plain global; JSON.parse pruning still applies.
  }

  // Feed ads arrive in the browse response the same way.
  let initialData: unknown;
  try {
    Object.defineProperty(window, 'ytInitialData', {
      configurable: true,
      enumerable: true,
      get() {
        return initialData;
      },
      set(value: unknown) {
        initialData = value;
      },
    });
  } catch {
    // Optional: the player is what matters.
  }

  // `/player` is the first load; `/get_watch` is what the app fetches when you
  // click another video. The rest can also carry a player payload.
  const AD_API_PATTERN = /\/youtubei\/v1\/(?:player|get_watch|next|browse|search|reel|guide)(?:[/?]|$)/;
  const isPlayerApi = (url: unknown): boolean =>
    typeof url === 'string' && AD_API_PATTERN.test(url);

  const originalFetch = window.fetch;
  if (typeof originalFetch === 'function') {
    window.fetch = async function patchedFetch(this: unknown, input: RequestInfo | URL, init?: RequestInit) {
      const response = await originalFetch.call(this, input, init);
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (!isPlayerApi(url)) return response;

      try {
        const body = JSON.parse(await response.clone().text()) as unknown;
        prune(body);
        const headers = new Headers(response.headers);
        headers.delete('content-length');
        return new Response(JSON.stringify(body), {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      } catch {
        return response;
      }
    } as typeof window.fetch;
  }

  // SPA navigation - clicking another video - goes through XMLHttpRequest, not
  // fetch, so the player response has to be rewritten in place as well.
  if (typeof XMLHttpRequest !== 'undefined') {
    const xhr = XMLHttpRequest.prototype;
    const open = xhr.open;
    const send = xhr.send;

    xhr.open = function patchedOpen(this: XMLHttpRequest & { orbUrl?: string }, method: string, url: string | URL, ...rest: unknown[]) {
      this.orbUrl = String(url);
      return (open as (...args: unknown[]) => void).call(this, method, url, ...rest);
    } as typeof xhr.open;

    xhr.send = function patchedSend(this: XMLHttpRequest & { orbUrl?: string }, ...args: unknown[]) {
      const request = this;
      if (isPlayerApi(request.orbUrl)) {
        request.addEventListener('readystatechange', () => {
          if (request.readyState !== 4) return;
          try {
            if (request.responseType === '' || request.responseType === 'text') {
              const pruned = JSON.stringify(prune(JSON.parse(request.responseText)));
              Object.defineProperty(request, 'responseText', { configurable: true, get: () => pruned });
              Object.defineProperty(request, 'response', {
                configurable: true,
                get: () => (request.responseType === 'json' ? JSON.parse(pruned) : pruned),
              });
            } else if (request.responseType === 'json') {
              prune(request.response);
            }
          } catch {
            // Leave the response untouched if it is not JSON.
          }
        });
      }
      return (send as (...args: unknown[]) => void).apply(request, args);
    } as typeof xhr.send;
  }
}

export const YOUTUBE_AD_SCRIPT = `(${installYouTubeAdBlock.toString()})();`;

export const YOUTUBE_HOST_PATTERN = /(^|\.)(youtube\.com|youtube-nocookie\.com)$/i;
