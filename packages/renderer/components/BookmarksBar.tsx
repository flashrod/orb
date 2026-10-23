import React, { useState } from 'react';
import { BookmarkSimple, CaretDown, CaretRight, Folder, FolderOpen, Plus, Trash } from '@phosphor-icons/react';
import { BookmarkItem, useBookmarkStore } from '../stores/bookmarks';

export default function BookmarksBar({ onNavigate }: { onNavigate: (url: string) => void }) {
  const { items, addFolder, moveItem, removeItem } = useBookmarkStore();
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [folderDraft, setFolderDraft] = useState(false);

  const roots = items.filter((item) => item.parentId === null);
  const children = (id: string) => items.filter((item) => item.parentId === id);
  const handleDrop = (event: React.DragEvent, item?: BookmarkItem) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain') || draggingId;
    if (!id || id === item?.id) return;
    moveItem(id, item?.kind === 'folder' ? item.id : item?.parentId ?? null, item?.kind === 'bookmark' ? item.id : undefined);
    setDraggingId(null);
  };

  const renderItem = (item: BookmarkItem, nested = false) => item.kind === 'folder' ? (
    <div key={item.id} className="relative shrink-0" draggable onDragStart={(event) => { setDraggingId(item.id); event.dataTransfer.setData('text/plain', item.id); }} onDragEnd={() => setDraggingId(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, item)}>
      <button type="button" aria-expanded={openFolder === item.id} onClick={() => setOpenFolder(openFolder === item.id ? null : item.id)} className={`orb-control flex h-7 items-center gap-1.5 rounded px-2 text-[11px] ${draggingId === item.id ? 'opacity-40' : ''}`}>
        {openFolder === item.id ? <FolderOpen className="orb-muted h-3.5 w-3.5" /> : <Folder className="orb-muted h-3.5 w-3.5" />}{item.title}<CaretDown className="orb-muted h-3 w-3" />
      </button>
      {openFolder === item.id && <div className={`orb-elevated orb-shadow absolute ${nested ? 'left-full top-0 ml-1' : 'left-0 top-full mt-1'} z-30 min-w-48 rounded-lg border orb-border p-1`}>
        {children(item.id).length ? children(item.id).map((child) => renderItem(child, true)) : <p className="orb-muted px-2 py-2 text-[10px]">Drop bookmarks here</p>}
        <button type="button" onClick={() => removeItem(item.id)} className="orb-control flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[10px]"><Trash className="h-3 w-3" /> Delete folder</button>
      </div>}
    </div>
  ) : (
    <div key={item.id} draggable onDragStart={(event) => { setDraggingId(item.id); event.dataTransfer.setData('text/plain', item.id); }} onDragEnd={() => setDraggingId(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, item)} className={`group relative flex shrink-0 items-center ${draggingId === item.id ? 'opacity-40' : ''}`}>
      <button type="button" title={`${item.title} · ${item.url}`} onClick={() => onNavigate(item.url)} className="orb-control flex h-7 max-w-40 items-center gap-1.5 rounded px-2 text-[11px]"><BookmarkSimple className="orb-muted h-3.5 w-3.5 shrink-0" /><span className="truncate">{item.title}</span></button>
      <button type="button" aria-label={`Remove ${item.title} bookmark`} onClick={() => removeItem(item.id)} className="orb-elevated absolute -right-1 -top-1 z-10 hidden h-4 w-4 items-center justify-center rounded-full border orb-border group-hover:flex"><Trash className="h-2.5 w-2.5" /></button>
    </div>
  );

  return <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event)} className="orb-surface flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b orb-border px-3 scrollbar-hide">
    {roots.map((item) => renderItem(item))}
    {folderDraft ? <form className="flex shrink-0 items-center gap-1" onSubmit={(event) => { event.preventDefault(); const input = event.currentTarget.elements.namedItem('folder') as HTMLInputElement; if (input.value.trim()) addFolder(input.value.trim()); setFolderDraft(false); }}><input name="folder" autoFocus aria-label="New bookmark folder name" placeholder="Folder name" className="orb-frame h-6 w-28 rounded border orb-border px-1.5 text-[10px] outline-none" onKeyDown={(event) => { if (event.key === 'Escape') setFolderDraft(false); }} /><button type="submit" className="orb-accent text-[10px]">Add</button></form> : <button type="button" onClick={() => setFolderDraft(true)} title="New bookmark folder" aria-label="New bookmark folder" className="orb-control flex h-7 w-7 shrink-0 items-center justify-center rounded"><Plus className="h-3.5 w-3.5" /></button>}
    {roots.length === 0 && !folderDraft && <span className="orb-muted text-[10px]">Bookmarks you add will appear here</span>}
  </div>;
}
