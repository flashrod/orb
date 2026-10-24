/**
 * Renderer-side alias for the shared hibernation policy. The webview tab path
 * and the main-process TabManager must apply exactly the same rules.
 */
export {
  MEMORY_GUARD_IDLE_MS,
  MEMORY_GUARD_MAX_LIVE_TABS,
  selectTabsToHibernate,
  shouldHibernate,
  type MemoryGuardTab,
  type TabState,
} from '../../shared/tabLifecycle';
