import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Space {
  id: string;
  name: string;
  icon: string;
  color: string;
  tabIds: string[];
  profileId: string;
  createdAt: number;
  updatedAt: number;
}

interface SpaceStore {
  spaces: Space[];
  activeSpaceId: string | null;
  addSpace: (space: Omit<Space, 'id' | 'createdAt' | 'updatedAt' | 'profileId'> & { profileId?: string }) => string;
  removeSpace: (id: string) => void;
  setActiveSpace: (id: string | null) => void;
  updateSpace: (id: string, partial: Partial<Space>) => void;
  reorderSpace: (id: string, index: number) => void;
  addTabToSpace: (spaceId: string, tabId: string) => void;
  removeTabFromSpace: (spaceId: string, tabId: string) => void;
}

export const useSpaceStore = create<SpaceStore>()(
  persist(
    (set) => ({
      spaces: [],
      activeSpaceId: null,
      addSpace: (space: Omit<Space, 'id' | 'createdAt' | 'updatedAt' | 'profileId'> & { profileId?: string }) => {
        const id = crypto.randomUUID();
        const now = Date.now();
        set((state) => ({
          spaces: [
            ...state.spaces,
            { ...space, profileId: space.profileId || 'default', id, createdAt: now, updatedAt: now },
          ],
          activeSpaceId: id,
        }));
        return id;
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
      reorderSpace: (id, index) => set((state) => {
        const spaces = [...state.spaces];
        const currentIndex = spaces.findIndex((space) => space.id === id);
        if (currentIndex < 0) return state;
        const [space] = spaces.splice(currentIndex, 1);
        spaces.splice(Math.max(0, Math.min(index, spaces.length)), 0, space);
        return { spaces };
      }),
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
      version: 2,
      migrate: (persistedState: any) => ({
        ...persistedState,
        spaces: Array.isArray(persistedState?.spaces)
          ? persistedState.spaces.map((space: Partial<Space>) => ({ ...space, profileId: space.profileId || 'default' }))
          : [],
      }),
      storage: createJSONStorage(() => localStorage),
    }
  )
);
