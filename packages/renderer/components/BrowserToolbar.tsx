import React, { useState } from 'react';
import { ArrowClockwise, ArrowLeft, ArrowRight, BookmarkSimple, CursorClick, DotsSixVertical, House, List, Plus, PuzzlePiece, Trash, X } from '@phosphor-icons/react';
import AddressBar from './AddressBar';
import { useBookmarkStore } from '../stores/bookmarks';
import { ToolbarItemId, useToolbarStore } from '../stores/toolbar';
import { useAppearanceStore } from '../stores/appearance';

type ExtensionInfo = { id: string; name: string; version: string };

export default function BrowserToolbar({
  activeTab, onNavigate, onBack, onForward, onReload, onPickElement, canPickElement,
}: {
  activeTab: { id: string; url: string; title: string } | undefined;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onPickElement: () => void;
  canPickElement: boolean;
}) {
  const { order, hidden, move } = useToolbarStore();
  const { setTabLayout, tabLayout, bookmarksBarVisible, setBookmarksBarVisible } = useAppearanceStore();
  const { items: bookmarks, addBookmark, removeItem } = useBookmarkStore();
  const [extensionsOpen, setExtensionsOpen] = useState(false);
  const [extensions, setExtensions] = useState<ExtensionInfo[]>([]);
  const [extensionError, setExtensionError] = useState('');
  const [dragId, setDragId] = useState<ToolbarItemId | null>(null);

  const bookmarked = Boolean(activeTab && bookmarks.some((item) => item.kind === 'bookmark' && item.url === activeTab.url));
  const toggleBookmark = () => {
    if (!activeTab || activeTab.url === 'about:blank') return;
    const existing = bookmarks.find((item) => item.kind === 'bookmark' && item.url === activeTab.url);
    if (existing) removeItem(existing.id);
    else addBookmark(activeTab.title || (() => { try { return new URL(activeTab.url).hostname; } catch { return activeTab.url; } })(), activeTab.url);
  };

  const refreshExtensions = async () => {
    try { setExtensions(await window.orbApi.listExtensions()); setExtensionError(''); }
    catch (error) { setExtensionError(error instanceof Error ? error.message : 'Could not load extensions.'); }
  };

  const renderControl = (id: ToolbarItemId) => {
    switch (id) {
      case 'home': return <button type="button" aria-label="Home" title="Home" onClick={() => onNavigate('about:blank')} className="orb-control flex h-8 w-8 items-center justify-center rounded-md"><House className="h-4 w-4" /></button>;
      case 'back': return <button type="button" aria-label="Back" title="Back" onClick={onBack} className="orb-control flex h-8 w-8 items-center justify-center rounded-md"><ArrowLeft className="h-4 w-4" /></button>;
      case 'forward': return <button type="button" aria-label="Forward" title="Forward" onClick={onForward} className="orb-control flex h-8 w-8 items-center justify-center rounded-md"><ArrowRight className="h-4 w-4" /></button>;
      case 'reload': return <button type="button" aria-label="Reload" title="Reload" onClick={onReload} className="orb-control flex h-8 w-8 items-center justify-center rounded-md"><ArrowClockwise className="h-4 w-4" /></button>;
      case 'address': return <AddressBar activeTab={activeTab} onNavigate={onNavigate} />;
      case 'bookmark': return <button type="button" aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this page'} title={bookmarked ? 'Remove bookmark' : 'Bookmark this page'} onClick={toggleBookmark} disabled={!activeTab || activeTab.url === 'about:blank'} className={`orb-control flex h-8 w-8 items-center justify-center rounded-md ${bookmarked ? 'orb-accent' : ''} disabled:opacity-35`}><BookmarkSimple weight={bookmarked ? 'fill' : 'regular'} className="h-4 w-4" /></button>;
      case 'bookmarks': return <button type="button" aria-label={bookmarksBarVisible ? 'Hide bookmarks bar' : 'Show bookmarks bar'} title={bookmarksBarVisible ? 'Hide bookmarks bar' : 'Show bookmarks bar'} onClick={() => setBookmarksBarVisible(!bookmarksBarVisible)} className={`orb-control flex h-8 w-8 items-center justify-center rounded-md ${bookmarksBarVisible ? 'orb-accent' : ''}`}><BookmarkSimple className="h-4 w-4" /></button>;
      case 'extensions': return <div className="relative"><button type="button" aria-label="Extensions" title="Extensions" onClick={() => { setExtensionsOpen(!extensionsOpen); void refreshExtensions(); }} className="orb-control flex h-8 w-8 items-center justify-center rounded-md"><PuzzlePiece className="h-4 w-4" /></button>{extensionsOpen && <div className="orb-elevated orb-shadow absolute right-0 top-full z-40 mt-2 w-72 rounded-lg border orb-border p-3">
        <div className="mb-2 flex items-center justify-between"><h3 className="orb-strong text-xs font-semibold">Extensions</h3><button type="button" aria-label="Close extensions" onClick={() => setExtensionsOpen(false)} className="orb-control flex h-6 w-6 items-center justify-center rounded"><X className="h-3.5 w-3.5" /></button></div>
        {extensionError && <p role="alert" className="mb-2 text-[10px] text-red-700">{extensionError}</p>}
        {extensions.length ? <div className="mb-3 max-h-48 space-y-1 overflow-y-auto">{extensions.map((extension) => <div key={extension.id} className="orb-control flex items-center gap-2 rounded px-2 py-1.5"><span className="min-w-0 flex-1"><span className="orb-strong block truncate text-[11px]">{extension.name}</span><span className="orb-muted block text-[9px]">Version {extension.version}</span></span><button type="button" aria-label={`Remove ${extension.name}`} onClick={async () => { await window.orbApi.removeExtension(extension.id); await refreshExtensions(); }} className="orb-control flex h-6 w-6 items-center justify-center rounded"><Trash className="h-3 w-3" /></button></div>)}</div> : <p className="orb-muted mb-3 text-[10px]">No extensions installed.</p>}
        <button type="button" onClick={async () => { try { await window.orbApi.installExtension(); await refreshExtensions(); } catch (error) { setExtensionError(error instanceof Error ? error.message : 'Could not install extension.'); } }} className="orb-accent-bg flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-2 text-[11px] font-medium text-white"><Plus className="h-3.5 w-3.5" />Load unpacked extension</button>
        <p className="orb-muted mt-2 text-[9px] leading-4">Extensions run with access to websites you visit. Load only extensions you trust.</p>
      </div>}</div>;
      case 'picker': return <button type="button" aria-label="Pick an element for a Boost" title="Pick an element for a Boost" onClick={onPickElement} disabled={!canPickElement} className="orb-control flex h-8 w-8 items-center justify-center rounded-md disabled:opacity-35"><CursorClick className="h-4 w-4" /></button>;
      case 'tabLayout': return <button type="button" aria-label={tabLayout === 'top' ? 'Use side tabs' : 'Use top tabs'} title={tabLayout === 'top' ? 'Use side tabs' : 'Use top tabs'} onClick={() => setTabLayout(tabLayout === 'top' ? 'split' : 'top')} className="orb-control flex h-8 w-8 items-center justify-center rounded-md"><List className="h-4 w-4" /></button>;
    }
  };

  return <div aria-label="Browser toolbar" className="orb-surface flex h-[52px] shrink-0 items-center gap-0.5 border-b orb-border px-2">
    {order.filter((id) => !hidden.includes(id)).map((id) => <div key={id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const source = (event.dataTransfer.getData('text/plain') || dragId) as ToolbarItemId | null; if (source && source !== id) move(source, id); setDragId(null); }} className={`group flex min-w-0 shrink-0 items-center ${id === 'address' ? 'min-w-[160px] flex-1' : ''} ${dragId === id ? 'opacity-40' : ''}`}>
      <button type="button" draggable aria-label={`Drag ${id} toolbar item`} title="Drag to reorder" onDragStart={(event) => { setDragId(id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', id); }} onDragEnd={() => setDragId(null)} className="orb-muted flex h-6 w-3 cursor-grab items-center justify-center opacity-0 transition-opacity group-hover:opacity-60 active:cursor-grabbing"><DotsSixVertical className="h-3.5 w-3.5" /></button>
      <div className={`min-w-0 ${id === 'address' ? 'flex-1' : ''}`}>{renderControl(id)}</div>
    </div>)}
  </div>;
}
