# Orb — Product Requirements Document

## Vision
A spiritual successor to Arc Browser built from reverse-engineered design patterns, not Arc's code. Clean-room implementation so Arc refugees can import their data before Arc sunsets on December 22, 2026.

## Tech Stack
| Layer | Choice |
|-------|--------|
| Engine | Chromium via Electron |
| Shell | Electron + TypeScript (TSX) |
| UI Framework | React |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Storage | SQLite (better-sqlite3) |
| Packaging | electron-builder |

## Target Platforms
- macOS (primary)
- Windows (secondary)

## Features (v1)

### 1. Shell & Window Management
- Electron `BrowserWindow` main process
- Single shared `Session` across all windows (shared cache)
- `nodeIntegration: false`, `contextIsolation: true` on all renderers
- App menu (File, Edit, View, Window, Help)
- Window controls (traffic lights on macOS)

### 2. Sidebar + Spaces
- Vertical sidebar replacing traditional tab strip
- Spaces = named containers with icon + color
- Each Space holds its own set of tabs
- Switching Spaces swaps the active tab set
- Add / rename / delete Spaces
- Persist Spaces to SQLite

### 3. Tab Management
- Tabs live inside Spaces
- Open new tab (⌘T)
- Close tab (⌘W)
- Pin tab
- Tab titles + favicons
- Tab URL display in address bar

### 4. Command Bar (⌘T or ⌘Shift+P)
- Spotlight-like overlay
- Search: open tabs, history, bookmarks, URLs
- Host-based dedup: group multiple tabs from the same host (e.g., github.com, notion.so, figma.com) under one result
- Keyboard navigation (arrow keys, enter to select)
- Quick actions: new space, new tab, close tab, toggle dev tools

### 5. Address Bar
- URL input with autocomplete
- Search fallback (default search engine)
- Security indicator (lock icon for HTTPS)

### 6. Boosts (per-site custom CSS/JS)
- Inject custom CSS and JavaScript into any domain
- Element picker: hover over element → generate optimal CSS selector using semantic scoring
  - Score boosts: ARIA labels (+0.8), semantic tags (+0.5), test IDs (+1), href (+0.6), role (+0.5)
  - Score penalties: gibberish class names (-1), unknown attributes (-0.1)
- Store boosts per domain in SQLite
- Enable/disable boosts per domain
- Default boost: hide common cookie banners

### 7. Ad Blocking
- Subscribe to filter lists:
  - EasyList
  - uBlock Origin filters (by year)
  - CookieMonster
  - EasyPrivacy
  - AdGuard Ads / Tracking Protection
- Fetch lists from blocklist URLs
- Match network requests against filter rules
- Block matched requests before they load

### 8. Site-Specific Behavior
- Keepalive allowlist: prevent background tabs from sleeping for sites like Gmail, Slack, Notion, Linear, Figma, Twitter, Spotify
- Picture-in-Picture allow/deny lists
- Per-site behavior stored in SQLite

### 9. Arc Data Import
- Parse Arc's export format
- Import: bookmarks, tabs, spaces, history
- Map Arc Spaces → Orb Spaces
- Map Arc tabs → Orb tabs

### 10. Settings
- Default search engine
- Theme (dark/light/system)
- Ad blocker toggle
- Boosts management
- Data import/export
- Keyboard shortcuts reference

## Non-Goals (v1)
- Split view / little arc
- Easel canvas
- Arc Max AI features
- Mobile apps
- Sync / cloud account
- Extensions (Chrome Web Store) — v2

## Success Metrics
- App launches in < 2 seconds
- Baseline RAM < 300MB with one empty tab
- Command Bar opens in < 100ms
- Import Arc data without data loss
- All core features work offline
