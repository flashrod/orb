import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ClockCounterClockwise } from '@phosphor-icons/react';
import { useBrowserPreferencesStore } from '../stores/preferences';
import { countRestorableTabs, restoreLastSession } from '../lib/restoreSession';
import { useTabStore } from '../stores/tabs';
import { useSpaceStore } from '../stores/spaces';
import { useSplitViewStore } from '../stores/splitView';

const ASKED_KEY = 'orb-startup-asked';

/** Closes every tab and leaves one blank tab so the window is never empty. */
function startFresh(): void {
  const tabState = useTabStore.getState();
  useSplitViewStore.getState().close();
  for (const tab of [...tabState.tabs]) tabState.removeTab(tab.id);

  const spaceState = useSpaceStore.getState();
  let spaceId = spaceState.activeSpaceId || spaceState.spaces[0]?.id;
  if (!spaceId) {
    spaceState.addSpace({ name: 'Personal', icon: 'globe', color: '#a0522d', tabIds: [] });
    spaceId = useSpaceStore.getState().activeSpaceId || useSpaceStore.getState().spaces[0]?.id;
  }
  if (!spaceId) return;
  useTabStore.getState().addTab({ spaceId, url: 'about:blank', title: 'New Tab', favicon: '', isPinned: false, isActive: true });
}

/**
 * Asks once per launch what to do with the tabs from the last session. The
 * live store already holds those tabs, so "keep" is the cheap path and
 * "start fresh" is the explicit one.
 */
export default function StartupSessionPrompt({ enabled }: { enabled: boolean }) {
  const startupBehavior = useBrowserPreferencesStore((state) => state.startupBehavior);
  const setStartupBehavior = useBrowserPreferencesStore((state) => state.setStartupBehavior);
  const [open, setOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const [restorable, setRestorable] = useState(0);
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    try {
      if (sessionStorage.getItem(ASKED_KEY)) return;
      sessionStorage.setItem(ASKED_KEY, '1');
    } catch {
      // Private modes without session storage: still ask, just every launch.
    }

    const live = useTabStore.getState().tabs.filter((tab) => tab.url && tab.url !== 'about:blank').length;
    const pending = countRestorableTabs();
    if (live + pending === 0) return;

    if (startupBehavior === 'restore') {
      if (pending > 0) restoreLastSession();
      return;
    }
    if (startupBehavior === 'fresh') {
      startFresh();
      return;
    }

    setOpenCount(live);
    setRestorable(pending);
    setOpen(true);
  }, [enabled, startupBehavior]);

  const total = openCount + restorable;
  const keep = () => {
    if (remember) setStartupBehavior('restore');
    if (restorable > 0) restoreLastSession();
    setOpen(false);
  };
  const fresh = () => {
    if (remember) setStartupBehavior('fresh');
    startFresh();
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') keep();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, remember, restorable]);

  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/25 p-6 backdrop-blur-[3px]"
      onMouseDown={(event) => { if (event.target === event.currentTarget) keep(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="startup-session-title"
        className="orb-elevated orb-strong w-full max-w-[420px] rounded-2xl border orb-border p-5 shadow-[0_24px_60px_rgba(41,37,36,0.24)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2.5">
          <span className="orb-accent-soft orb-accent flex h-8 w-8 items-center justify-center rounded-lg">
            <ClockCounterClockwise className="h-4 w-4" />
          </span>
          <h2 id="startup-session-title" className="text-sm font-semibold">Pick up where you left off?</h2>
        </div>

        <p className="orb-muted mt-3 text-xs leading-5">
          {total === 1 ? 'You had 1 tab open in your last session.' : `You had ${total} tabs open in your last session.`}
        </p>

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={keep}
            className="orb-accent-bg flex-1 rounded-md px-3 py-2 text-xs font-medium text-white transition-transform active:scale-[0.99]"
          >
            {restorable > 0 ? `Reopen ${restorable === 1 ? 'tab' : `${restorable} tabs`}` : 'Keep my tabs'}
          </button>
          <button
            type="button"
            onClick={fresh}
            className="orb-control flex-1 rounded-md border orb-border px-3 py-2 text-xs font-medium"
          >
            Start fresh
          </button>
        </div>

        <label className="orb-muted mt-4 flex cursor-pointer items-center gap-2 text-[11px]">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--orb-accent)]"
          />
          Remember my choice
        </label>
      </div>
    </div>,
    document.body,
  );
}
