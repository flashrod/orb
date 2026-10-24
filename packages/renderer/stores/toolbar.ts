import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ToolbarItemId = 'home' | 'back' | 'forward' | 'reload' | 'address' | 'bookmark' | 'bookmarks' | 'extensions' | 'picker' | 'glance' | 'tabLayout' | 'downloads' | 'settings';

export const TOOLBAR_ITEMS: { id: ToolbarItemId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'back', label: 'Back' },
  { id: 'forward', label: 'Forward' },
  { id: 'reload', label: 'Reload' },
  { id: 'address', label: 'Search and address field' },
  { id: 'bookmark', label: 'Bookmark current page' },
  { id: 'bookmarks', label: 'Show bookmarks bar' },
  { id: 'extensions', label: 'Extensions' },
  { id: 'picker', label: 'Pick page element for a Boost' },
  { id: 'glance', label: 'Preview hovered link' },
  { id: 'tabLayout', label: 'Switch tab placement' },
  { id: 'downloads', label: 'Downloads' },
  { id: 'settings', label: 'Settings' },
];

const defaultOrder = TOOLBAR_ITEMS.map((item) => item.id);

/**
 * Secondary controls stay available in Settings → Toolbar but are hidden by
 * default: the toolbar should read as back / forward / reload / address /
 * bookmark / downloads / settings.
 */
export const DEFAULT_HIDDEN_TOOLBAR_ITEMS: ToolbarItemId[] = ['bookmarks', 'extensions', 'picker', 'glance', 'tabLayout'];

interface ToolbarStore {
  order: ToolbarItemId[];
  hidden: ToolbarItemId[];
  move: (id: ToolbarItemId, beforeId?: ToolbarItemId) => void;
  toggleHidden: (id: ToolbarItemId) => void;
  reset: () => void;
}

export const useToolbarStore = create<ToolbarStore>()(persist((set) => ({
  order: defaultOrder,
  hidden: DEFAULT_HIDDEN_TOOLBAR_ITEMS,
  move: (id, beforeId) => set((state) => {
    const order = state.order.filter((item) => item !== id);
    const index = beforeId ? order.indexOf(beforeId) : -1;
    order.splice(index >= 0 ? index : order.length, 0, id);
    return { order };
  }),
  toggleHidden: (id) => set((state) => ({ hidden: state.hidden.includes(id) ? state.hidden.filter((item) => item !== id) : [...state.hidden, id] })),
  reset: () => set({ order: defaultOrder, hidden: [] }),
}), {
  name: 'orb-toolbar',
  version: 2,
  storage: createJSONStorage(() => localStorage),
  migrate: (state: any, version: number) => ({
    order: Array.isArray(state?.order) ? [...state.order.filter((id: ToolbarItemId) => TOOLBAR_ITEMS.some((item) => item.id === id)), ...(TOOLBAR_ITEMS.map((item) => item.id).filter((id) => !state.order.includes(id)))] : defaultOrder,
    // v2 decluttered the default toolbar; keep anything the user already hid.
    hidden: Array.isArray(state?.hidden)
      ? [...new Set([...state.hidden.filter((id: ToolbarItemId) => TOOLBAR_ITEMS.some((item) => item.id === id)), ...(version < 2 ? DEFAULT_HIDDEN_TOOLBAR_ITEMS : [])])]
      : DEFAULT_HIDDEN_TOOLBAR_ITEMS,
  }),
}));
