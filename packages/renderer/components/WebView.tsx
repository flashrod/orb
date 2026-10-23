import React, { useEffect, useRef, useState, useCallback } from 'react';

export default function WebView({
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
}) {
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

    const handleDidCommitNavigation = () => {
      const wv = webview as any;
      const currentUrl = wv.getURL ? wv.getURL() : '';
      onUrlChange?.(currentUrl);
    };

    const handleDidStopLoad = () => {
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

    const handleNewWindow = (e: any) => {
      e.preventDefault();
    };

    webview.addEventListener('did-start-loading', handleDidStartLoading);
    webview.addEventListener(
      'did-commit-navigation',
      handleDidCommitNavigation
    );
    webview.addEventListener('did-stop-load', handleDidStopLoad);
    webview.addEventListener('new-window', handleNewWindow);

    return () => {
      webview.removeEventListener('did-start-loading', handleDidStartLoading);
      webview.removeEventListener(
        'did-commit-navigation',
        handleDidCommitNavigation
      );
      webview.removeEventListener('did-stop-load', handleDidStopLoad);
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

  // Set webview src when url changes
  useEffect(() => {
    const wv = webviewRef.current as any;
    if (wv && url) {
      wv.src = url;
    }
  }, [url]);

  return (
    <div className="absolute inset-0 w-full h-full bg-black relative">
      <webview
        ref={webviewRef}
        className="w-full h-full"
        allowpopups
        preload=""
      />
      {isLoading && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span className="text-sm text-white/60">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
}
