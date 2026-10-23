import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_PROFILE, migrateProfiles, ProfileSummary } from '../lib/profiles';

interface ProfileStore {
  profiles: ProfileSummary[];
  addProfile: (name: string, color?: string) => string | null;
  renameProfile: (id: string, name: string) => boolean;
  recolorProfile: (id: string, color: string) => void;
  removeProfile: (id: string) => boolean;
}

export const useProfileStore = create<ProfileStore>()(persist((set, get) => ({
  profiles: [{ ...DEFAULT_PROFILE }],
  addProfile: (rawName, color = '#657a60') => {
    const name = rawName.trim().slice(0, 48);
    if (!name || get().profiles.some((profile) => profile.name.toLowerCase() === name.toLowerCase())) return null;
    const id = crypto.randomUUID();
    set((state) => ({ profiles: [...state.profiles, { id, name, color, createdAt: Date.now() }] }));
    return id;
  },
  renameProfile: (id, rawName) => {
    const name = rawName.trim().slice(0, 48);
    const current = get().profiles.find((profile) => profile.id === id);
    if (!current || !name || get().profiles.some((profile) => profile.id !== id && profile.name.toLowerCase() === name.toLowerCase())) return false;
    set((state) => ({ profiles: state.profiles.map((profile) => profile.id === id ? { ...profile, name } : profile) }));
    return true;
  },
  recolorProfile: (id, color) => set((state) => ({ profiles: state.profiles.map((profile) => profile.id === id ? { ...profile, color } : profile) })),
  removeProfile: (id) => {
    if (id === DEFAULT_PROFILE.id || !get().profiles.some((profile) => profile.id === id)) return false;
    set((state) => ({ profiles: state.profiles.filter((profile) => profile.id !== id) }));
    return true;
  },
}), {
  name: 'orb-profiles',
  version: 1,
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ profiles: state.profiles }),
  migrate: (persistedState: any) => ({ profiles: migrateProfiles(persistedState?.profiles) }),
}));
