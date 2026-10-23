import React, { useMemo, useRef, useState } from 'react';
import { BookmarkSimple, CaretDown, Folder, FolderOpen, Plus, Trash } from '@phosphor-icons/react';
import { BookmarkItem, useBookmarkStore } from '../stores/bookmarks';
import { exportBookmarkHtml, parseBookmarkHtml } from '../lib/bookmarkHtml';
import { resolveWebsiteAddress } from '../lib/navigation';

export default function BookmarksManager({ onNavigate }: { onNavigate: (url: string) => void }) {
  const { items, addBookmark, addFolder, moveItem, removeItem, renameItem, importItems } = useBookmarkStore();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(items.filter((item) => item.kind === 'folder').map((item) => item.id)));
  const [form, setForm] = useState<'bookmark' | 'folder' | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const search = query.trim().toLowerCase();
  const folders = items.filter((item) => item.kind === 'folder');
  const descendantsOf = (id: string) => {
    const descendants = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const item of items) if (item.parentId && descendants.has(item.parentId) && !descendants.has(item.id)) { descendants.add(item.id); changed = true; }
    }
    return descendants;
  };
  const searchableIds = useMemo(() => {
    const found = new Set(items.filter((item) => `${item.title} ${item.url}`.toLowerCase().includes(search)).map((item) => item.id));
    let changed = true;
    while (changed) {
      changed = false;
      for (const item of items) if (item.parentId && found.has(item.id) && !found.has(item.parentId)) { found.add(item.parentId); changed = true; }
    }
    return found;
  }, [items, search]);
  const children = (id: string | null) => items.filter((item) => item.parentId === id && (!search || searchableIds.has(item.id)));

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (form === 'folder') {
      if (!title.trim()) { setError('Enter a folder name.'); return; }
      addFolder(title.trim(), parentId);
      setExpanded((current) => new Set(current).add(parentId || ''));
    } else if (form === 'bookmark') {
      const normalizedUrl = resolveWebsiteAddress(url);
      if (!normalizedUrl) { setError('Enter a valid website address.'); return; }
      addBookmark(title.trim() || (() => { try { return new URL(normalizedUrl).hostname; } catch { return normalizedUrl; } })(), normalizedUrl, parentId);
      setExpanded((current) => new Set(current).add(parentId || ''));
    }
    setForm(null); setTitle(''); setUrl(''); setParentId(null); setError('');
  };

  const exportFile = () => {
    const objectUrl = URL.createObjectURL(new Blob([exportBookmarkHtml(items)], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a'); link.href = objectUrl; link.download = 'orb-bookmarks.html'; link.click(); URL.revokeObjectURL(objectUrl);
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    try { importItems(parseBookmarkHtml(await file.text())); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not import bookmarks.'); }
  };

  const renderRows = (parent: string | null, depth = 0): React.ReactNode => children(parent).map((item) => {
    const isFolder = item.kind === 'folder';
    const isExpanded = expanded.has(item.id);
    const forbiddenParents = isFolder ? descendantsOf(item.id) : new Set<string>();
    return <React.Fragment key={item.id}>
      <div className="orb-elevated grid grid-cols-[minmax(0,1fr)_180px_auto] items-center gap-2 rounded-md border orb-border px-2 py-1.5" style={{ marginLeft: depth * 16 }}>
        <div className="flex min-w-0 items-center gap-2">
          {isFolder ? <button type="button" aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.title}`} aria-expanded={isExpanded} onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })} className="orb-control flex h-6 w-6 shrink-0 items-center justify-center rounded"><CaretDown className={`h-3 w-3 transition-transform ${isExpanded ? '' : '-rotate-90'}`} /></button> : <span className="w-6 shrink-0" />}
          {isFolder ? isExpanded ? <FolderOpen className="orb-accent h-4 w-4 shrink-0" /> : <Folder className="orb-accent h-4 w-4 shrink-0" /> : <BookmarkSimple className="orb-muted h-4 w-4 shrink-0" />}
          {editingId === item.id ? <input ref={inputRef} autoFocus aria-label={`Rename ${item.title}`} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => { if (draft.trim()) renameItem(item.id, draft.trim()); setEditingId(null); }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') setEditingId(null); }} className="orb-strong min-w-0 flex-1 rounded border orb-border bg-transparent px-2 py-1 text-xs outline-none" /> : <button type="button" onDoubleClick={() => { setEditingId(item.id); setDraft(item.title); }} onClick={() => { if (!isFolder) onNavigate(item.url); }} title={isFolder ? 'Double-click to rename folder' : `${item.url} · double-click to rename`} className="orb-strong min-w-0 flex-1 truncate text-left text-xs">{item.title}</button>}
          {item.kind === 'bookmark' && <span className="orb-muted hidden max-w-[180px] truncate text-[10px] lg:block">{item.url}</span>}
        </div>
        <select aria-label={`Move ${item.title} to folder`} value={item.parentId || ''} onChange={(event) => moveItem(item.id, event.target.value || null)} className="orb-strong h-7 min-w-0 rounded border orb-border bg-[var(--orb-elevated)] px-2 text-[10px]">
          <option value="">Bookmarks bar</option>
          {folders.filter((folder) => !forbiddenParents.has(folder.id) && folder.id !== item.id).map((folder) => <option key={folder.id} value={folder.id}>{folder.title}</option>)}
        </select>
        <button type="button" aria-label={`Delete ${item.title}`} onClick={() => setDeleteId(item.id)} className="orb-control flex h-7 w-7 items-center justify-center rounded"><Trash className="h-3.5 w-3.5" /></button>
      </div>
      {isFolder && isExpanded && renderRows(item.id, depth + 1)}
      {deleteId === item.id && <div role="alertdialog" aria-label={`Delete ${item.title}`} className="orb-elevated ml-8 flex items-center justify-between gap-3 rounded-md border orb-border px-3 py-2 text-xs" style={{ marginLeft: (depth + 1) * 16 }}><span className="orb-strong">Delete {item.title}{isFolder ? ' and everything inside it' : ''}?</span><span className="flex gap-1"><button type="button" onClick={() => setDeleteId(null)} className="orb-control rounded px-2 py-1">Cancel</button><button type="button" onClick={() => { removeItem(item.id); setDeleteId(null); }} className="rounded bg-red-700 px-2 py-1 text-white">Delete</button></span></div>}
    </React.Fragment>;
  });

  return <div className="mx-auto max-w-[760px] space-y-5">
    <div><h2 className="orb-strong text-sm font-semibold">Bookmarks</h2><p className="orb-muted mt-1 text-xs">Organize folders and saved pages. Drag items on the bookmarks bar or choose a folder here.</p></div>
    <div className="flex flex-wrap items-center gap-2">
      <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search bookmarks" placeholder="Find a bookmark or folder" className="orb-strong orb-placeholder h-9 min-w-48 flex-1 rounded-md border orb-border bg-transparent px-3 text-xs outline-none focus:border-[var(--orb-accent)]" />
      <button type="button" onClick={() => { setForm('bookmark'); setParentId(null); setTitle(''); setUrl(''); setError(''); }} className="orb-control flex h-9 items-center gap-1.5 rounded-md border orb-border px-3 text-xs"><Plus className="h-3.5 w-3.5" />Bookmark</button>
      <button type="button" onClick={() => { setForm('folder'); setParentId(null); setTitle(''); setError(''); }} className="orb-control flex h-9 items-center gap-1.5 rounded-md border orb-border px-3 text-xs"><Plus className="h-3.5 w-3.5" />Folder</button>
      <label className="orb-control flex h-9 cursor-pointer items-center rounded-md border orb-border px-3 text-xs">Import<input type="file" accept=".html,text/html" className="hidden" onChange={(event) => { void importFile(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>
      <button type="button" onClick={exportFile} className="orb-control h-9 rounded-md border orb-border px-3 text-xs">Export</button>
    </div>
    {form && <form onSubmit={save} className="orb-elevated grid grid-cols-[1fr_1.3fr_180px_auto] items-end gap-2 rounded-lg border orb-border p-3">
      <label className="orb-muted text-[10px]">{form === 'folder' ? 'Folder name' : 'Bookmark title'}<input value={title} onChange={(event) => setTitle(event.target.value)} aria-label={form === 'folder' ? 'Folder name' : 'Bookmark title'} placeholder={form === 'folder' ? 'Reading list' : 'Name'} className="orb-strong mt-1 h-8 w-full rounded border orb-border bg-transparent px-2 text-xs outline-none" /></label>
      {form === 'bookmark' ? <label className="orb-muted text-[10px]">Address<input value={url} onChange={(event) => setUrl(event.target.value)} aria-label="Bookmark address" placeholder="https://example.com" className="orb-strong mt-1 h-8 w-full rounded border orb-border bg-transparent px-2 text-xs outline-none" /></label> : <span />}
      <label className="orb-muted text-[10px]">Save in<select value={parentId || ''} onChange={(event) => setParentId(event.target.value || null)} aria-label="Bookmark folder" className="orb-strong mt-1 h-8 w-full rounded border orb-border bg-[var(--orb-elevated)] px-2 text-[10px]"><option value="">Bookmarks bar</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.title}</option>)}</select></label>
      <div className="flex gap-1"><button type="submit" className="orb-accent-bg h-8 rounded px-3 text-xs text-white">Save</button><button type="button" onClick={() => setForm(null)} className="orb-control h-8 rounded px-2 text-xs">Cancel</button></div>
      {error && <p role="alert" className="col-span-full text-xs text-red-700">{error}</p>}
    </form>}
    {error && !form && <p role="alert" className="text-xs text-red-700">{error}</p>}
    <div className="space-y-1.5">{items.length ? renderRows(null) : <p className="orb-muted rounded-lg border border-dashed orb-border px-4 py-10 text-center text-xs">No bookmarks yet. Add a page or import an HTML bookmarks file.</p>}</div>
  </div>;
}
