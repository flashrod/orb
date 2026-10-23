# Orb — Product Requirements Document

## Vision
A spiritual successor to Arc Browser built from reverse-engineered design patterns, not Arc's code. Clean-room implementation so Arc refugees can import their data before Arc sunsets on December 22, 2026.

Privacy-first by design: Brave-level ad/tracker blocking, Firefox-level anti-fingerprinting, Zen-level UI minimalism and customization.

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
- macOS (DMG)
- Windows (EXE/MSI)
- Linux (AppImage + .deb)

## Features (v1)

### 1. Shell & Window Management
- Electron `BrowserWindow` main process
- Single shared `Session` across all windows (shared cache/cookies)
- `nodeIntegration: false`, `contextIsolation: true` on all renderers
- App menu (File, Edit, View, Window, Help)
- Window controls (traffic lights on macOS)

### 2. Sidebar + Spaces (Zen-like)
- Vertical sidebar replacing traditional tab strip
- Spaces = named containers with icon + color
- Each Space holds its own set of tabs
- Switching Spaces swaps the active tab set
- Add / rename / delete Spaces
- Tab-count badge on each space
- Vertical tab panel (toggleable overlay)
- Sidebar auto-hide / compact mode

### 3. Tab Management
- Tabs live inside Spaces
- Open new tab (⌘T)
- Close tab (⌘W)
- Pin tab
- Tab titles + favicons
- Tab URL display in address bar
- Split view (Zen-like side-by-side tabs) — v1.5

### 4. Command Bar (⌘T or ⌘Shift+P)
- Spotlight-like overlay
- Search: open tabs, history, bookmarks, URLs
- Host-based dedup: group multiple tabs from the same host under one result
- Keyboard navigation (arrow keys, enter to select)
- Quick actions: new space, new tab, close tab, toggle dev tools
- URL navigation: type a URL or search query directly

### 5. Address Bar
- URL input with autocomplete
- Search fallback (default search engine)
- Security indicator (lock icon for HTTPS)
- HTTPS-only mode toggle

### 6. Boosts (per-site custom CSS/JS)
- Inject custom CSS and JavaScript into any domain
- Element picker: hover over element → generate optimal CSS selector using semantic scoring
  - Score boosts: ARIA labels (+0.8), semantic tags (+0.5), test IDs (+1), href (+0.6), role (+0.5)
  - Score penalties: gibberish class names (-1), unknown attributes (-0.1)
- Store boosts per domain in SQLite
- Enable/disable boosts per domain
- Default boost: hide common cookie banners

### 7. Ad Blocking (Brave-level, not slop)
- Subscribe to filter lists:
  - EasyList
  - uBlock Origin filters (by year)
  - CookieMonster
  - EasyPrivacy
  - AdGuard Ads / Tracking Protection
- Import uBlock Origin filter lists from local files
- **Proper filter list parser:**
  - Network rules: `||domain.com^`, `||domain.com^$script,third-party`, `/regex/`
  - Cosmetic rules: `example.com##.selector`, `##.selector`, `##+regex`
  - `$options` parsing: script, image, stylesheet, third-party, domain=, ~domain=
  - Allowlist: `@@||domain.com^`
- Block matched network requests before they load (`onBeforeRequest`)
- Element hiding via CSS injection (cosmetic filtering)
- User domain allowlist (permanent exceptions)
- Blocked request audit log (visibility into what was blocked and why)

### 8. Tracking Protection (Firefox-level, not slop)
- **Tracker blocking toggle** — separate from ad blocking
- **EasyPrivacy + CookieMonster** filter lists for trackers
- **Fingerprinting protection:**
  - Strip `Sec-CH-UA`, `Sec-CH-UA-Platform`, `Sec-CH-UA-Mobile`, `Sec-CH-UA-Model`, `Sec-CH-UA-Full-Version`, `Sec-CH-UA-Arch`, `Sec-CH-UA-Bitness`, `Sec-CH-UA-Full-Version-List`
  - Strip `X-Client-Data`, `X-Requested-With`
  - Reduce `Accept-Language` granularity to first entry
- **Referrer policy:** strip referrer on cross-origin navigation
- **HTTPS-only mode:** upgrade HTTP→HTTPS, block mixed content
- **WebRTC leak protection:** disable or proxy WebRTC to prevent IP leaks
- **Canvas/WebGL fingerprinting noise:** optional noise injection (v1.5)
- **Third-party cookie blocking:** block or restrict third-party cookies
- **Same-site cookie enforcement:** Strict/Lax options

### 9. Site-Specific Behavior
- Keepalive allowlist: prevent background tabs from sleeping
- Picture-in-Picture allow/deny lists
- Per-site behavior stored in SQLite

### 10. Advanced Settings Page
- **Privacy controls:** ad blocker on/off, tracker blocking on/off, cosmetic filtering on/off, HTTPS-only, referrer policy, WebRTC, third-party cookies
- **Filter list management:** enable/disable individual lists, add custom list URLs, refresh lists
- **Allowlist management:** view, add, remove allowlisted domains
- **Blocked requests log:** view recently blocked URLs with rule match reason
- **Theme:** dark/light/system, accent color picker
- **UI density:** compact/comfortable/spacious
- **Sidebar:** auto-hide, width, compact icons
- **Data:** import from Arc, export settings, clear browsing data
- **Keyboard shortcuts:** view and customize

### 11. Arc Data Import
- Parse Arc's export format
- Import: bookmarks, tabs, spaces, history
- Map Arc Spaces → Orb Spaces
- Map Arc tabs → Orb tabs

## Non-Goals (v1)
- Tor private windows
- Brave Rewards / BAT / crypto
- Sync / cloud account
- Mobile apps
- Extensions (Chrome Web Store) — v2
- Arc Max AI features
- Easel canvas
- Reading mode — v1.5

## Success Metrics
- App launches in < 2 seconds
- Baseline RAM < 300MB with one empty tab
- Command Bar opens in < 100ms
- Import Arc data without data loss
- All core features work offline
- Blocked requests visible in audit log
