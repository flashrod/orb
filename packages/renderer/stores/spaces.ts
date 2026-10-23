import { createStore } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Space {
  id: string;
  name: string;
  icon: string;
  color: string;
  tabIds: string[];
  createdAt: number;
  updatedAt: number;
}

interface SpaceStore {
  spaces: Space[];
  activeSpaceId: string | null;
  addSpace: (space: Omit<Space, 'id' | 'createdAt' | 'updatedAt'>) => void;
  removeSpace: (id: string) => void;
  setActiveSpace: (id: string | null) => void;
  updateSpace: (id: string, partial: Partial<Space>) => void;
  addTabToSpace: (spaceId: string, tabId: string) => void;
  removeTabFromSpace: (spaceId: string, tabId: string) => void;
}

export const useSpaceStore = create<SpaceStore>()(
  persist(
    (set) => ({
      spaces: [],
      activeSpaceId: null,
      addSpace: (space) => {
        const id = crypto.randomUUID();
        const now = Date.now();
        set((state) => ({
          spaces: [
            ...state.spaces,
            { ...space, id, createdAt: now, updatedAt: now },
          ],
          activeSpaceId: id,
        }));
      },
      removeSpace: (id) =>
        set((state) => ({
          spaces: state.spaces.filter((s) => s.id !== id),
          activeSpaceId: state.activeSpaceId === id ? null : state.activeSpaceId,
        })),
      setActiveSpace: (id) => set({ activeSpaceId: id }),
      updateSpace: (id, partial) =>
        set((state) => ({
          spaces: state.spaces.map((s) =>
            s.id === id ? { ...s, ...partial, updatedAt: Date.now() } : s
          ),
        })),
      addTabToSpace: (spaceId, tabId) =>
        set((state) => ({
          spaces: state.spaces.map((s) =>
            s.id === spaceId && !s.tabIds.includes(tabId)
              ? { ...s, tabIds: [...s.tabIds, tabId], updatedAt: Date.now() }
              : s
          ),
        })),
      removeTabFromSpace: (spaceId, tabId) =>
        set((state) => ({
          spaces: state.spaces.map((s) =>
            s.id === spaceId
              ? { ...s, tabIds: s.tabIds.filter((t) => t !== tabId), updatedAt: Date.now() }
              : s
          ),
        })),
    }),
    {
      name: 'orb-spaces',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
