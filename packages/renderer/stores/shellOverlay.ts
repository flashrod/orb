import { useEffect, useId } from 'react';
import { create } from 'zustand';

/**
 * Native page views sit above the React shell, so any shell UI that overlaps
 * the page area must temporarily hide them. Components that render floating UI
 * register here; the tab bridge hides the views while anything is open and
 * shows a captured snapshot instead.
 */
interface ShellOverlayStore {
  overlays: Record<string, boolean>;
  setOverlay: (id: string, open: boolean) => void;
}

export const useShellOverlayStore = create<ShellOverlayStore>((set) => ({
  overlays: {},
  setOverlay: (id, open) => set((state) => {
    if (Boolean(state.overlays[id]) === open) return state;
    const overlays = { ...state.overlays };
    if (open) overlays[id] = true;
    else delete overlays[id];
    return { overlays };
  }),
}));

export function useShellOverlay(open: boolean): void {
  const id = useId();
  const setOverlay = useShellOverlayStore((state) => state.setOverlay);
  useEffect(() => {
    setOverlay(id, open);
    return () => setOverlay(id, false);
  }, [id, open, setOverlay]);
}

export function useAnyShellOverlay(): boolean {
  return useShellOverlayStore((state) => Object.keys(state.overlays).length > 0);
}
