import React, { useEffect, useRef, useState } from 'react';

export default function WebView({
  tabId,
  url,
  spaceId,
}: {
  tabId: string;
  url: string;
  spaceId: string;
}) {
  const webviewRef = useRef<HTMLWebViewElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState('Loading...');

  useEffect(() => {
    if (!webviewRef.current) return;

    const webview = webviewRef.current;

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    const handleLoadCommit = () => {
      const wv = webview as any;
      setPageTitle(wv.getURL ? wv.getURL() : '');
    };

    const handleDidStopLoad = () => {
      setIsLoading(false);
      const wv = webview as any;
      setPageTitle(wv.getTitle ? wv.getTitle() : '');
    };

    const handleNewWindow = (e: any) => {
      // Handle new window requests (could open in new tab)
      e.preventDefault();
    };

    webview.addEventListener('did-start-loading', handleLoadStart);
    webview.addEventListener('did-commit-navigation', handleLoadCommit);
    webview.addEventListener('did-stop-load', handleDidStopLoad);
    webview.addEventListener('new-window', handleNewWindow);

    return () => {
      webview.removeEventListener('did-start-loading', handleLoadStart);
      webview.removeEventListener('did-commit-navigation', handleLoadCommit);
      webview.removeEventListener('did-stop-load', handleDidStopLoad);
      webview.removeEventListener('new-window', handleNewWindow);
    };
  }, [tabId, url, spaceId]);

  return (
    <div className="absolute inset-0 w-full h-full bg-black">
      <webview
        ref={webviewRef}
        src={url || 'https://orb.newtab'}
        className="w-full h-full"
        allowpopups
        preload={''}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span className="text-sm text-white/50">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
}
