# Orb

A spiritual successor to Arc Browser — built clean-room from reverse-engineered design patterns, not Arc's code. Orb brings Arc's Spaces, Boosts, and command bar to a privacy-first browser you fully control.

Built with **Electron + React + TypeScript + Vite + Tailwind + Zustand**. Chromium engine via Electron 30.

---

## Features (v1)

| Area | Feature |
|------|---------|
| **Navigation** | Sidebar + Spaces — named spaces with icons, colors, and per-space tab isolation |
| **Command Bar** | ⌘T / ⌘K Spotlight-like search with host-based dedup, tab switching, space switching, URL navigation |
| **Tabs** | Horizontal tab strip + vertical tab panel, tab groups (collapse/rename), pinned tabs, split view |
| **Bookmarks** | Nested bookmark organizer with folder hierarchy |
| **Boosts** | Per-site custom CSS/JS with intelligent element picker (Arc-style semantic scoring) |
| **Privacy** | Ad blocking (EasyList, uBlock Origin, EasyPrivacy, CookieMonster), tracker blocking, third-party cookie blocking, fingerprinting header stripping, HTTPS-only mode, domain allowlist, blocked-request audit log |
| **Arc Import** | Import bookmarks, tabs, spaces, and history from Arc export files |
| **Settings** | Zen-style bento settings page: themes (canvas/sage/night), accent picker, UI density, sidebar auto-hide/width, compact mode, search engine, keyboard shortcuts |
| **UX** | Warm monochrome Zen-inspired UI, flat cards, soft borders, typography-first, motion-reduction support |

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Engine | Chromium via Electron 30.5.1 |
| Shell | Electron + TypeScript |
| UI | React 18 (TSX) |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 (PostCSS) |
| State | Zustand 4 (localStorage persistence) |
| Storage | localStorage (SQLite planned) |
| Packaging | electron-builder (DMG / EXE / AppImage / .deb) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- macOS (Electron binary pre-installed for darwin-arm64)

### Development

```bash
# Clone the repo
git clone https://github.com/flashrod/orb.git
cd orb

# Install dependencies
npm install

# Run in development (Vite dev server + Electron)
npm run dev
```

`npm run dev` starts three processes concurrently:
1. **Vite** — serves the React renderer at `http://localhost:5173` with HMR
2. **esbuild watch** — bundles the Electron main process and preload scripts to `dist/`
3. **Electron** — launches the app, connecting to Vite's dev server

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘T / ⌘K | Open Command Bar |
| ⌘N | New tab |
| Esc | Close Command Bar / dismiss overlays |
| ⌘, | Open Settings |

---

## Build & Package

```bash
# Typecheck
npm run typecheck

# Build main process + preload + renderer for production
npm run build

# Package for distribution (DMG on macOS)
npm run dist
```

**Note:** The Electron binary is not committed to git (it lives in `node_modules/`). A fresh clone requires `npm install` followed by the manual Electron install step documented in `CONTRIBUTING.md` until postinstall automation is added.

---

## Project Structure

```
orb/
├── package.json                  # Root manifest + scripts
├── vite.config.mts               # Vite config (React plugin, renderer root)
├── postcss.config.js             # Tailwind CSS + Autoprefixer
├── tailwind.config.js            # Tailwind theme (orb.* warm monochrome tokens)
├── tsconfig.json                 # TypeScript config
├── electron-builder.json         # Packaging configuration
├── packages/
│   ├── main/                     # Electron main process
│   │   ├── index.ts              # App entry, window lifecycle, ad blocker init
│   │   ├── adBlocker.ts          # Filter list parser, network/request blocking
│   │   ├── ipcHandlers.ts        # IPC handlers (privacy, windows, dialogs)
│   │   ├── menu.ts               # Application menu (not yet wired — TODO)
│   │   ├── windowManager.ts      # Per-space window management
│   │   ├── extensions.ts         # Chrome extension load/restore
│   │   ├── filterRules.ts        # Filter rule compilation
│   │   └── boostsDatabase.ts     # Boost storage (localStorage-backed)
│   ├── preload/                  # ContextBridge preload scripts
│   │   ├── index.ts              # orbApi surface exposed to renderer
│   │   ├── types.ts              # ExposedApi TypeScript type
│   │   └── webview.ts            # WebView-specific preload
│   ├── renderer/                 # React UI (served by Vite)
│   │   ├── main.tsx              # React entry
│   │   ├── App.tsx               # App shell, keyboard shortcuts, orb:navigate listener
│   │   ├── index.html            # HTML entry
│   │   ├── styles/globals.css    # Zen design tokens (CSS variables + Tailwind)
│   │   ├── components/           # NavigationBar, AddressBar, TabBar, CommandBar, ...
│   │   ├── stores/               # Zustand stores (spaces, tabs, boosts, adBlocker, ...)
│   │   └── lib/                  # Navigation, tab groups, split view, tab actions
│   ├── ad-blocker/               # Filter list fetcher + URL matcher
│   ├── boosts-engine/            # Boosts element picker + CSS injector
│   ├── data-importer/            # Arc export parser
│   └── shared/                   # Shared types between main and renderer
├── prd.md                        # Product requirements
├── ROADMAP.md                    # Commit-sized feature roadmap
└── docs/                         # REA findings (Arc reverse-engineering reference)
```

---

## Privacy Philosophy

Orb's privacy is **real, not slop**:

- **Filter list parser**: Proper EasyList/uBlock syntax — `||domain.com^` network rules, `/regex/` patterns, `$options` modifiers, `$domain=`/`~domain=` domain restriction, cosmetic `##selector` / `##+regex` element hiding, `@@` allowlist exceptions
- **Ad blocking**: EasyList, uBlock Origin, EasyPrivacy, CookieMonster subscriptions — 60k+ network rules, 56k+ tracker rules, 28k+ cosmetic rules
- **Tracker blocking**: Separate toggle from ad blocking
- **Third-party cookies**: Blocked by default
- **Fingerprinting protection**: Strips `Sec-CH-UA*`, `X-Client-Data`, `X-Requested-With`, and other client-hint headers
- **HTTPS-only mode**: Upgrades HTTP→HTTPS automatically
- **Domain allowlist**: Per-domain exceptions for any blocking layer
- **Blocked-request audit log**: See what was blocked and why

---

## Contributing

- Keep commits small and granular (one feature area per commit)
- Push completed checkpoints to `origin/main`
- Run `npm run typecheck`, `npm run build`, and `npm test` before pushing
- Preserve user data when changing persisted Zustand stores; add versioned migrations
- Keep browser navigation and privacy behavior in the Electron main process; expose renderer capabilities through the typed preload API
- Do not create release packages unless explicitly requested

---

## License

MIT
