import { create } from 'zustand';
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
      addSpace: (space: Omit<Space, 'id' | 'createdAt' | 'updatedAt'>) => {
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
      removeSpace: (id: string) =>
        set((state) => ({
          spaces: state.spaces.filter((s: Space) => s.id !== id),
          activeSpaceId: state.activeSpaceId === id ? null : state.activeSpaceId,
        })),
      setActiveSpace: (id: string | null) => set({ activeSpaceId: id }),
      updateSpace: (id: string, partial: Partial<Space>) =>
        set((state) => ({
          spaces: state.spaces.map((s: Space) =>
            s.id === id ? { ...s, ...partial, updatedAt: Date.now() } : s
          ),
        })),
      addTabToSpace: (spaceId: string, tabId: string) =>
        set((state) => ({
          spaces: state.spaces.map((s: Space) =>
            s.id === spaceId && !s.tabIds.includes(tabId)
              ? { ...s, tabIds: [...s.tabIds, tabId], updatedAt: Date.now() }
              : s
          ),
        })),
      removeTabFromSpace: (spaceId: string, tabId: string) =>
        set((state) => ({
          spaces: state.spaces.map((s: Space) =>
            s.id === spaceId
              ? { ...s, tabIds: s.tabIds.filter((t: string) => t !== tabId), updatedAt: Date.now() }
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
