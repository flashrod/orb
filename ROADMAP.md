# Orb Roadmap — Commit-Sized Chunks

## DONE (pushed to main)

| Commit | Feature |
|--------|---------|
| 1 | Initial scaffold: Electron + React + TSX + Vite + Tailwind |
| 2 | Clean repo: remove node_modules, add .gitignore |
| 3 | Fix TypeScript errors |
| 4 | WebView: navigation methods + loading states |
| 5 | Shell: NavigationBar + AddressBar wired to WebView |
| 6 | Tabs: WebView title/favicon/URL → tab store |
| 7 | Sidebar: tab-count badges per space |
| 8 | Sidebar: vertical tabs panel with toggle |
| 9 | Command bar: real tab search + host dedup + URL nav |
| 10 | Privacy: ad/tracker blocker + uBlock import + fingerprinting headers |
| 11 | Privacy: proper filter list parser (EasyList/uBlock syntax, element hiding, regex, domain allowlist) |

## NEXT — PRIVACY (advanced, not slop)

Each of these is ONE small commit:

- [ ] **HTTPS-only mode** — upgrade HTTP→HTTPS, block mixed content, settings toggle
- [ ] **Referrer policy** — strip referrer on cross-origin, settings toggle
- [ ] **Third-party cookie blocking** — block/restrict 3p cookies, settings toggle
- [ ] **WebRTC leak protection** — disable WebRTC IP leak, settings toggle
- [ ] **Blocked requests audit log** — store + display blocked URLs with match reason
- [ ] **Allowlist UI** — view/add/remove allowlisted domains in settings
- [ ] **Filter list UI** — enable/disable lists, add custom URLs, refresh

## NEXT — ZEN-LIKE UX

Each is ONE small commit:

- [ ] **Split view** — side-by-side tabs in a space
- [ ] **UI density** — compact/comfortable/spacious toggle
- [ ] **Sidebar auto-hide** + width control
- [ ] **Theme system** — dark/light/system + accent color picker
- [ ] **Bookmarks** — add/edit/delete, folders/tags
- [ ] **Reading mode** — reader view for articles (v1.5)

## NEXT — BOOSTS ENGINE

Each is ONE small commit:

- [ ] **Boosts store** — CRUD per-domain CSS/JS in SQLite
- [ ] **Element picker** — hover → generate selector (Arc's SelectorPicker algorithm)
- [ ] **Boosts editor UI** — edit CSS/JS per domain, enable/disable toggle
- [ ] **Default cookie-banner boost** — ship with common selectors blocked

## NEXT — ARC DATA IMPORT

- [ ] **Arc export parser** — read Arc's export JSON/HTML
- [ ] **Import UI** — select file, map spaces/tabs/bookmarks
- [ ] **Import execution** — write to Orb's stores

## LAST — PACKAGING (only when you say so)

- [ ] electron-builder config: DMG (macOS), EXE (Windows), AppImage + .deb (Linux)
- [ ] Code signing config
- [ ] Auto-updater

## Rule

No commit touches more than one feature area. If a feature needs multiple commits, split by layer: main-process → preload → renderer component → settings UI.
