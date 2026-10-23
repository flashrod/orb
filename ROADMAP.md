# Orb Roadmap

Orb is a calm, customizable Chromium browser for people who want their browsing arranged around workspaces, with privacy that is visible and controllable. This list tracks shipped behavior separately from work that is still needed for a dependable daily browser. The visual direction is familiar, polished horizontal tabs with Chrome/Firefox affordances and a quieter Arc/Zen-inspired vertical workspace sidebar.

## Shipped

- [x] Electron + React + TypeScript + Vite + Tailwind + Zustand browser shell.
- [x] Chromium WebView navigation, address entry, back/forward/reload, and horizontal tabs.
- [x] Loading, page URL, and title state follow Electron WebView navigation events, including failed loads.
- [x] Spaces with persistent names and selection; vertical tab rail.
- [x] Command bar for finding tabs/spaces, creating tabs/spaces, and navigating.
- [x] Essentials pinned sites, persisted per Space.
- [x] Warm Paper/Sage/Night themes, accent choices, editable palette colors, compact density, sidebar width/auto-hide, and motion preference.
- [x] Selectable top tabs or a vertical tab rail while navigation and address controls stay at the top.
- [x] Keep the horizontal tab row and vertical tab rail mutually exclusive; put top tabs above the shared navigation/address row.
- [x] Drag to reorder tabs in either tab layout.
- [x] Shared omnibox/search handling for the address bar, command bar, and new-tab search; focus the address bar automatically on a new tab.
- [x] Compact, single-line top tabs with favicons and clear active-tab styling.
- [x] Basic network ad/tracker filtering, imported uBlock-style lists, HTTPS-only redirect, and request-header reduction for some fingerprinting signals.

## Daily-browser foundations

### Profiles and workspaces

- [ ] **Profile model** — create, rename, switch, and delete profiles with isolated Electron sessions (cookies, cache, local storage, and permissions).
- [ ] **Space-to-profile assignment** — each workspace belongs to one profile; switching spaces selects the correct profile session.
- [ ] **Workspace restore** — persist open tabs, their order, pinned state, selected tab, and restore them on restart.
- [ ] **Essentials scope** — make pin scope explicit (profile-wide or workspace-specific), with migration from the current per-Space pins.
- [ ] **Workspace management** — rename, recolor, reorder, duplicate, and safely delete workspaces; keep changes across restarts.
- [ ] **Sidebar context switcher** — quick profile/workspace switching, clear active state, keyboard access, and smooth show/hide behavior.

### Tabs, folders, and bookmarks

- [ ] **Real split view** — render two independent pages side by side, choose/swap either pane, resize the divider, and close a pane without losing its tab.
- [ ] **Tab organization** — group tabs into named folders, collapse groups, pin tabs, and search hundreds of tabs quickly. Drag reordering is shipped.
- [ ] **Bookmarks model** — add/edit/remove bookmarks and organize them in nested folders with persistent ordering.
- [ ] **Bookmarks bar** — optional bar along the address area; drag bookmarks/folders onto it and reorder them; hide/show from the bar or Settings.
- [ ] **Compact mode** — hide selected browser chrome for more page space, with a reliable keyboard shortcut and discoverable controls to restore it.
- [ ] **Show/hide controls** — independent toggles for sidebar, tab strip, bookmarks bar, and other browser chrome, with sensible minimum navigation access.

### Contextual browsing

- [ ] **Search preferences** — let users choose a default search provider and keep address/search interpretation consistent across the omnibox, command bar, and new-tab page.
- [ ] **Glance link preview** — open a temporary, isolated preview from a link without replacing the current page; support pin/open/close and keyboard control.
- [ ] **Compare sources** — send links into either split-view pane and keep the current reading position.
- [ ] **Keyboard-first navigation** — complete shortcut map, command bar actions for profiles/spaces/bookmarks, and accessible focus handling.

### Privacy and settings

- [ ] **Settings information architecture** — Appearance, Privacy, and Boosts sections are shipped; add dedicated Tabs, Sidebar, Bookmarks, Profiles, and Shortcuts sections. Every visible toggle must affect real behavior.
- [ ] **Shields controls** — block ads/trackers and unwanted page elements by default; per-site exceptions, allowlist management, list controls, and a blocked-request log.
- [ ] **Filter-list management** — enable/disable lists, add custom list URLs, update lists, and report failures/status.
- [ ] **HTTPS-only behavior** — test redirect/fallback behavior and add a site exception flow.
- [ ] **Referrer controls** — configurable cross-site referrer policy.
- [ ] **Third-party cookie controls** — block or partition third-party cookies, with per-site exceptions.
- [ ] **WebRTC controls** — reduce local network IP exposure with a compatibility option.
- [ ] **Fingerprinting protection** — go beyond request-header reduction; document each mitigation, expose granular controls, and measure site breakage.
- [ ] **Privacy compatibility** — explain blocked items, let users allow a site temporarily, and make it easy to undo exceptions.

## Boosts engine

Each row is a focused commit or small reviewable slice.

- [x] **Boosts store** — CRUD per-domain CSS/JS records in an on-disk SQLite database, with typed IPC and a renderer store.
- [x] **Element picker** — hover to inspect/select an element, generate a resilient semantic selector, save a per-domain hide rule, and apply it immediately.
- [x] **Boosts editor** — list/edit per-domain CSS/JS, enable/disable, delete, and save changes.
- [ ] **Boost validation and preview** — validate syntax and preview unsaved changes before applying.
- [ ] **Apply boosts** — inject enabled CSS/JS only into matching domains, with safe lifecycle handling on navigation.
- [ ] **Default cookie-banner boost** — ship opt-in/common selectors, explain what it hides, and provide a per-site disable control.

## Arc migration

- [ ] **Arc export parser** — parse supported spaces, tabs, bookmarks, and folders without depending on Arc code.
- [ ] **Import preview** — show a mapping and conflicts before changing profile/workspace data.
- [ ] **Import execution** — import into the chosen Orb profile and allow undo/rollback.

## Quality and release

- [ ] **Browser smoke checklist** — navigation, downloads, permissions, media, tabs, restart restore, profiles, and privacy settings.
- [ ] **Cross-platform UX pass** — verify keyboard conventions, window chrome, and settings on macOS, Windows, and Linux.
- [ ] **Packaging** — DMG/EXE/AppImage/.deb, signing, and updates only when requested by the user.

## Working rules

- Keep commits small and limited to one feature area. For multi-layer work, use separate checkpoints for main process, preload, renderer, and settings when each checkpoint remains coherent.
- Do not claim a privacy control is complete until it changes runtime behavior and has a visible status/exception path.
- Do not package Orb until the user asks.
