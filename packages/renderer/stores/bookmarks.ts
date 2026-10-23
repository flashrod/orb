import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  parentId: string | null;
  kind: 'bookmark' | 'folder';
}

export interface BookmarkImportNode {
  title: string;
  url?: string;
  children?: BookmarkImportNode[];
}

interface BookmarkStore {
  items: BookmarkItem[];
  addBookmark: (title: string, url: string, parentId?: string | null) => void;
  addFolder: (title: string) => void;
  removeItem: (id: string) => void;
  moveItem: (id: string, parentId: string | null, beforeId?: string) => void;
  renameItem: (id: string, title: string) => void;
  importItems: (nodes: BookmarkImportNode[], parentId?: string | null) => void;
  hasUrl: (url: string) => boolean;
}

export const useBookmarkStore = create<BookmarkStore>()(persist((set, get) => ({
  items: [],
  addBookmark: (title, url, parentId = null) => set((state) => {
    const existing = state.items.find((item) => item.kind === 'bookmark' && item.url === url);
    if (existing) return { items: state.items.map((item) => item.id === existing.id ? { ...item, title, parentId } : item) };
    return { items: [...state.items, { id: crypto.randomUUID(), title, url, parentId, kind: 'bookmark' }] };
  }),
  addFolder: (title) => set((state) => ({ items: [...state.items, { id: crypto.randomUUID(), title, url: '', parentId: null, kind: 'folder' }] })),
  removeItem: (id) => set((state) => {
    const removed = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const item of state.items) if (item.parentId && removed.has(item.parentId) && !removed.has(item.id)) { removed.add(item.id); changed = true; }
    }
    return { items: state.items.filter((item) => !removed.has(item.id)) };
  }),
  moveItem: (id, parentId, beforeId) => set((state) => {
    const item = state.items.find((candidate) => candidate.id === id);
    if (!item || id === parentId) return state;
    let ancestorId = parentId;
    while (ancestorId) {
      if (ancestorId === id) return state;
      ancestorId = state.items.find((candidate) => candidate.id === ancestorId)?.parentId || null;
    }
    const rest = state.items.filter((candidate) => candidate.id !== id);
    const moved = { ...item, parentId };
    const targetIndex = beforeId ? rest.findIndex((candidate) => candidate.id === beforeId) : -1;
    rest.splice(targetIndex >= 0 ? targetIndex : rest.length, 0, moved);
    return { items: rest };
  }),
  renameItem: (id, title) => set((state) => ({ items: state.items.map((item) => item.id === id ? { ...item, title } : item) })),
  importItems: (nodes, parentId = null) => set((state) => {
    const items = [...state.items];
    const append = (entries: BookmarkImportNode[], parent: string | null) => {
      for (const entry of entries) {
        if (entry.url && items.some((item) => item.kind === 'bookmark' && item.url === entry.url)) continue;
        const folder = !entry.url;
        const id = crypto.randomUUID();
        items.push({ id, title: entry.title || (folder ? 'Imported folder' : entry.url || 'Bookmark'), url: entry.url || '', parentId: parent, kind: folder ? 'folder' : 'bookmark' });
        if (folder && entry.children?.length) append(entry.children, id);
      }
    };
    append(nodes, parentId);
    return { items };
  }),
  hasUrl: (url) => get().items.some((item) => item.kind === 'bookmark' && item.url === url),
}), { name: 'orb-bookmarks', storage: createJSONStorage(() => localStorage) }));
