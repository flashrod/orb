import React, { forwardRef, useEffect, useRef, useState, useCallback, useImperativeHandle } from 'react';
import { pickPageElement, PickedElement } from '../lib/elementPicker';
import { profilePartition } from '../lib/profiles';
import { useBoostStore } from '../stores/boosts';
import {
  TOGGLE_MEDIA_PLAYBACK_SCRIPT,
  TOGGLE_PIP_SCRIPT,
  type MediaActionResult,
} from '../../shared/media';
import { nextZoomFactor } from '../../shared/zoom';

type WebViewHandle = {
  navigateBack: () => void;
  navigateForward: () => void;
  navigateReload: () => void;
  navigateHardReload: () => void;
  zoom: (direction: 'in' | 'out' | 'reset') => void;
  loadUrl: (url: string) => void;
  applyCSS: (css: string) => Promise<void>;
  pickElement: () => Promise<PickedElement | null>;
  findInPage: (text: string, forward: boolean, findNext: boolean) => void;
  stopFindInPage: (action: 'clearSelection' | 'keepSelection' | 'activateSelection') => void;
  isAudible: () => boolean;
  print: () => void;
  printToPDF: (options: { printBackground?: boolean; preferCSSPageSize?: boolean }) => Promise<Uint8Array>;
  togglePictureInPicture: () => Promise<MediaActionResult>;
  toggleMediaPlayback: () => Promise<MediaActionResult>;
  executeJavaScript: (code: string) => Promise<unknown>;
};

export default forwardRef<WebViewHandle, {
  tabId: string;
  url: string;
  spaceId: string;
  profileId: string;
  onUrlChange?: (url: string) => void;
  onTitleChange?: (title: string) => void;
  onFaviconChange?: (favicon: string) => void;
  onLoadingChange?: (loading: boolean) => void;
  onGlanceLink?: (url: string) => void;
  onFoundInPage?: (result: { activeMatchOrdinal: number; matches: number }) => void;
}>(({
  tabId,
  url,
  spaceId,
  profileId,
  onUrlChange,
  onTitleChange,
  onFaviconChange,
  onLoadingChange,
  onGlanceLink,
  onFoundInPage,
}: {
  tabId: string;
  url: string;
  spaceId: string;
  profileId: string;
  onUrlChange?: (url: string) => void;
  onTitleChange?: (title: string) => void;
  onFaviconChange?: (favicon: string) => void;
  onLoadingChange?: (loading: boolean) => void;
  onGlanceLink?: (url: string) => void;
  onFoundInPage?: (result: { activeMatchOrdinal: number; matches: number }) => void;
}, ref) => {
  const webviewRef = useRef<HTMLWebViewElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState('Loading...');
  const [favicon, setFavicon] = useState('');
  const insertedCssKeys = useRef<string[]>([]);

  const navigateBack = useCallback(() => {
    const wv = webviewRef.current;
    if (wv) (wv as any).back();
  }, []);

  const navigateForward = useCallback(() => {
    const wv = webviewRef.current;
    if (wv) (wv as any).forward();
  }, []);

  const navigateReload = useCallback(() => {
    const wv = webviewRef.current;
    if (wv) (wv as any).reload();
  }, []);

  const navigateHardReload = useCallback(() => {
    const wv = webviewRef.current;
    if (wv) (wv as any).reloadIgnoringCache();
  }, []);

  const zoom = useCallback((direction: 'in' | 'out' | 'reset') => {
    const wv = webviewRef.current as any;
    if (!wv) return;
    const current = typeof wv.getZoomFactor === 'function' ? wv.getZoomFactor() : 1;
    wv.setZoomFactor(nextZoomFactor(current, direction));
  }, []);

  const loadUrl = useCallback((newUrl: string) => {
    const wv = webviewRef.current as any;
    if (wv) wv.src = newUrl;
  }, []);

  const applyCSS = useCallback(async (css: string) => {
    const webview = webviewRef.current as any;
    if (!webview || !css.trim()) return;
    const key = await webview.insertCSS(css);
    insertedCssKeys.current.push(key);
  }, []);

  const clearInsertedCSS = useCallback(async () => {
    const webview = webviewRef.current as any;
    if (!webview) return;
    const keys = insertedCssKeys.current.splice(0);
    await Promise.all(keys.map((key) => webview.removeInsertedCSS(key).catch(() => undefined)));
  }, []);

  useEffect(() => {
    if (!webviewRef.current) return;

    const webview = webviewRef.current;

    const handleDidStartLoading = () => {
      setIsLoading(true);
      onLoadingChange?.(true);
    };

    const handleNavigation = (event: any) => {
      const wv = webview as any;
      void clearInsertedCSS();
      const currentUrl = event?.url || (wv.getURL ? wv.getURL() : '');
      onUrlChange?.(currentUrl);
    };

    const handleInPageNavigation = (event: any) => {
      const wv = webview as any;
      const currentUrl = event?.url || (wv.getURL ? wv.getURL() : '');
      onUrlChange?.(currentUrl);
    };

    const handleDidStopLoading = () => {
      setIsLoading(false);
      onLoadingChange?.(false);
      const wv = webview as any;
      const title = wv.getTitle ? wv.getTitle() : '';
      if (title) {
        setPageTitle(title);
        onTitleChange?.(title);
      }
    };

    const handleDidFailLoad = (event: any) => {
      if (event.isMainFrame === false) return;
      setIsLoading(false);
      onLoadingChange?.(false);
    };

    const handleFoundInPage = (event: any) => {
      const result = event?.result;
      if (!result) return;
      onFoundInPage?.({ activeMatchOrdinal: result.activeMatchOrdinal ?? 0, matches: result.matches ?? 0 });
    };

    const handleIpcMessage = (event: any) => {
      if (event.channel === 'orb:glance-link' && typeof event.args?.[0] === 'string') onGlanceLink?.(event.args[0]);
    };
    const handleDomReady = () => {
      const wv = webview as any;
      void wv.executeJavaScript(`(() => {
        if (window.__orbGlanceLinkTracking) return;
        window.__orbGlanceLinkTracking = true;
        document.addEventListener('pointerover', (event) => {
          const target = event.target;
          const anchor = target instanceof Element ? target.closest('a[href]') : null;
          if (anchor && window.orbPageApi?.suggestGlanceLink) window.orbPageApi.suggestGlanceLink(anchor.href);
        }, true);
      })()`).catch(() => undefined);

      void (async () => {
        try {
          const boostStore = useBoostStore.getState();
          if (!boostStore.loaded) await boostStore.loadBoosts();
          const host = new URL(wv.getURL()).hostname;
          const boost = useBoostStore.getState().getBoostForDomain(host);
          if (!boost?.enabled) return;
          if (boost.css.trim()) await applyCSS(boost.css);
          if (boost.js.trim()) await wv.executeJavaScript(boost.js, true);
        } catch {
          // A broken Boost should never block the page itself.
        }
      })();
    };

    const handleFaviconUpdated = (event: any, faviconUrls: string[]) => {
      const fav = Array.isArray(faviconUrls) ? faviconUrls[0] : '';
      if (fav) {
        setFavicon(fav);
        onFaviconChange?.(fav);
      }
    };

    const handleTitleUpdated = (event: any, title: string) => {
      if (typeof title === 'string' && title.trim().length > 0) {
        setPageTitle(title);
        onTitleChange?.(title);
      }
    };

    webview.addEventListener('did-start-loading', handleDidStartLoading);
    webview.addEventListener('did-navigate', handleNavigation);
    webview.addEventListener('did-navigate-in-page', handleInPageNavigation);
    webview.addEventListener('did-stop-loading', handleDidStopLoading);
    webview.addEventListener('did-fail-load', handleDidFailLoad);
    webview.addEventListener('ipc-message', handleIpcMessage);
    webview.addEventListener('found-in-page', handleFoundInPage);
    webview.addEventListener('dom-ready', handleDomReady);
    ;(webview as any).addEventListener('page-favicon-updated', handleFaviconUpdated);
    ;(webview as any).addEventListener('page-title-updated', handleTitleUpdated);

    return () => {
      webview.removeEventListener('did-start-loading', handleDidStartLoading);
      webview.removeEventListener('did-navigate', handleNavigation);
      webview.removeEventListener('did-navigate-in-page', handleInPageNavigation);
      webview.removeEventListener('did-stop-loading', handleDidStopLoading);
      webview.removeEventListener('did-fail-load', handleDidFailLoad);
      webview.removeEventListener('ipc-message', handleIpcMessage);
      webview.removeEventListener('found-in-page', handleFoundInPage);
      webview.removeEventListener('dom-ready', handleDomReady);
      ;(webview as any).removeEventListener('page-favicon-updated', handleFaviconUpdated);
      ;(webview as any).removeEventListener('page-title-updated', handleTitleUpdated);
    };
  }, [
    tabId,
    url,
    spaceId,
    onUrlChange,
    onTitleChange,
    onFaviconChange,
    onLoadingChange,
    onGlanceLink,
    onFoundInPage,
    clearInsertedCSS,
    applyCSS,
  ]);

  // Expose navigation methods to parent
  useImperativeHandle(ref, () => ({
    navigateBack,
    navigateForward,
    navigateReload,
    navigateHardReload,
    zoom,
    loadUrl,
    applyCSS,
    isLoading,
    isAudible: () => Boolean((webviewRef.current as any)?.isCurrentlyAudible?.()),
    pickElement: async () => {
      const webview = webviewRef.current;
      if (!webview || isLoading) return null;
      return pickPageElement(webview);
    },
    findInPage: (text, forward, findNext) => {
      const webview = webviewRef.current as any;
      if (!webview || !text) return;
      webview.findInPage(text, { forward, findNext });
    },
    stopFindInPage: (action) => {
      const webview = webviewRef.current as any;
      webview?.stopFindInPage(action);
    },
    print: () => {
      const webview = webviewRef.current as any;
      webview?.print();
    },
    printToPDF: (options) => {
      const webview = webviewRef.current as any;
      if (!webview) return Promise.reject(new Error('Nothing to export yet.'));
      return webview.printToPDF(options);
    },
    togglePictureInPicture: () => {
      const webview = webviewRef.current as any;
      if (!webview) return Promise.resolve({ ok: false, error: 'This tab is not loaded.' });
      return webview.executeJavaScript(TOGGLE_PIP_SCRIPT, true);
    },
    toggleMediaPlayback: () => {
      const webview = webviewRef.current as any;
      if (!webview) return Promise.resolve({ ok: false, error: 'This tab is not loaded.' });
      return webview.executeJavaScript(TOGGLE_MEDIA_PLAYBACK_SCRIPT, true);
    },
    executeJavaScript: (code) => {
      const webview = webviewRef.current as any;
      if (!webview) return Promise.reject(new Error('This tab is not loaded.'));
      return webview.executeJavaScript(code, true);
    },
  }), [navigateBack, navigateForward, navigateReload, navigateHardReload, zoom, loadUrl, applyCSS, isLoading]);

  // Set webview src when url changes
  useEffect(() => {
    const wv = webviewRef.current as any;
    if (wv && url) {
      wv.src = url;
    }
  }, [url]);

  return (
    <div className="orb-frame absolute inset-0 h-full w-full overflow-hidden">
      <webview
        ref={webviewRef}
        className="w-full h-full"
        partition={profilePartition(profileId)}
      />
    </div>
  );
});
