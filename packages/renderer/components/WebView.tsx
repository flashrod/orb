import React, { forwardRef, useEffect, useRef, useState, useCallback, useImperativeHandle } from 'react';
import { pickPageElement, PickedElement } from '../lib/elementPicker';

type WebViewHandle = {
  navigateBack: () => void;
  navigateForward: () => void;
  navigateReload: () => void;
  loadUrl: (url: string) => void;
  pickElement: () => Promise<PickedElement | null>;
};

export default forwardRef<WebViewHandle, {
  tabId: string;
  url: string;
  spaceId: string;
  onUrlChange?: (url: string) => void;
  onTitleChange?: (title: string) => void;
  onFaviconChange?: (favicon: string) => void;
  onLoadingChange?: (loading: boolean) => void;
}>(({
  tabId,
  url,
  spaceId,
  onUrlChange,
  onTitleChange,
  onFaviconChange,
  onLoadingChange,
}: {
  tabId: string;
  url: string;
  spaceId: string;
  onUrlChange?: (url: string) => void;
  onTitleChange?: (title: string) => void;
  onFaviconChange?: (favicon: string) => void;
  onLoadingChange?: (loading: boolean) => void;
}, ref) => {
  const webviewRef = useRef<HTMLWebViewElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState('Loading...');
  const [favicon, setFavicon] = useState('');

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

  const loadUrl = useCallback((newUrl: string) => {
    const wv = webviewRef.current as any;
    if (wv) wv.src = newUrl;
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
      const currentUrl = event?.url || (wv.getURL ? wv.getURL() : '');
      onUrlChange?.(currentUrl);
    };

    const handleDidStopLoading = () => {
      setIsLoading(false);
      onLoadingChange?.(false);
      const wv = webview as any;
      const title = wv.getTitle ? wv.getTitle() : '';
      setPageTitle(title);
      onTitleChange?.(title);
      const fav = wv.getFavicon ? wv.getFavicon() : '';
      setFavicon(fav);
      onFaviconChange?.(fav);
    };

    const handleDidFailLoad = (event: any) => {
      if (event.isMainFrame === false) return;
      setIsLoading(false);
      onLoadingChange?.(false);
    };

    const handleNewWindow = (e: any) => {
      e.preventDefault();
    };

    webview.addEventListener('did-start-loading', handleDidStartLoading);
    webview.addEventListener('did-navigate', handleNavigation);
    webview.addEventListener('did-navigate-in-page', handleNavigation);
    webview.addEventListener('did-stop-loading', handleDidStopLoading);
    webview.addEventListener('did-fail-load', handleDidFailLoad);
    webview.addEventListener('new-window', handleNewWindow);

    return () => {
      webview.removeEventListener('did-start-loading', handleDidStartLoading);
      webview.removeEventListener('did-navigate', handleNavigation);
      webview.removeEventListener('did-navigate-in-page', handleNavigation);
      webview.removeEventListener('did-stop-loading', handleDidStopLoading);
      webview.removeEventListener('did-fail-load', handleDidFailLoad);
      webview.removeEventListener('new-window', handleNewWindow);
    };
  }, [
    tabId,
    url,
    spaceId,
    onUrlChange,
    onTitleChange,
    onFaviconChange,
    onLoadingChange,
  ]);

  // Expose navigation methods to parent
  useImperativeHandle(ref, () => ({
    navigateBack,
    navigateForward,
    navigateReload,
    loadUrl,
    pickElement: async () => {
      const webview = webviewRef.current;
      if (!webview || isLoading) return null;
      return pickPageElement(webview);
    },
  }));

  // Set webview src when url changes
  useEffect(() => {
    const wv = webviewRef.current as any;
    if (wv && url) {
      wv.src = url;
    }
  }, [url]);

  return (
    <div className="orb-frame absolute inset-0 h-full w-full">
      <webview
        ref={webviewRef}
        className="w-full h-full"
        allowpopups
        preload=""
      />
      {isLoading && (
        <div className="orb-frame absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 orb-border" style={{ borderTopColor: 'var(--orb-accent)' }} />
            <span className="orb-muted text-sm">Opening page</span>
          </div>
        </div>
      )}
    </div>
  );
});
