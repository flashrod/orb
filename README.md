# Orb

A calm, private browser for macOS built clean-room from reverse-engineered design patterns, not Arc's code.

Orb brings Spaces, Boosts, and a command bar to a privacy-first browser you fully control. Warm monochrome UI, real ad and tracker blocking, and an interface you can restyle completely.

Built with Electron + React + TypeScript + Vite + Tailwind + Zustand. Chromium engine via Electron 30.

---

## Features

**Spaces** Named, color-coded spaces that isolate tabs, bookmarks, and history by context. Work, personal, and research never mix.

**Command Bar** Spotlight-like search (⌘T / ⌘K) with host-based deduplication. Switch tabs, open spaces, or navigate to a URL from one input.

**Tabs** Horizontal tab strip and vertical tab panel. Tab groups with collapse and rename. Pinned tabs. Split view with a draggable divider.

**Boosts** Per-site custom CSS and JavaScript with an intelligent element picker. Hide cookie banners, reshape layouts, or strip noise.

**Privacy** Ad and tracker blocking using real EasyList, uBlock Origin, EasyPrivacy, and CookieMonster rules. Third-party cookies blocked by default. Fingerprinting protection strips client-hint headers. HTTPS-only mode upgrades HTTP automatically. Domain allowlist and blocked-request audit log.

**Arc Import** Import bookmarks, tabs, spaces, and history from Arc export files.

**Settings** Themes (canvas, sage, night), accent picker, UI density, sidebar auto-hide and width, compact mode, search engine, keyboard shortcuts.

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
| Packaging | electron-builder |

---

## Getting Started

### Prerequisites

- Node.js 18+
- macOS (Apple Silicon)

### Development

```bash
git clone https://github.com/flashrod/orb.git
cd orb
npm install
npm run dev
```

`npm run dev` starts Vite, esbuild watch, and Electron concurrently. The renderer serves at `http://localhost:5173` with HMR.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘T / ⌘K | Open Command Bar |
| ⌘N | New tab |
| Esc | Close overlays |
| ⌘, | Open Settings |

---

## Build & Package

```bash
npm run typecheck
npm run build
npm run dist
```

The Electron binary is not committed to git. A fresh clone requires `npm install` plus the manual Electron install step until postinstall automation is added.

---

## Project Structure

```
orb/
├── package.json
├── vite.config.mts
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── electron-builder.json
├── packages/
│   ├── main/
│   │   ├── index.ts        # App entry, window lifecycle, ad blocker init
│   │   ├── adBlocker.ts    # Filter list parser, network blocking
│   │   ├── ipcHandlers.ts  # IPC handlers (privacy, windows, dialogs)
│   │   ├── menu.ts         # Application menu
│   │   ├── windowManager.ts# Per-space window management
│   │   ├── extensions.ts   # Chrome extension load/restore
│   │   ├── filterRules.ts  # Filter rule compilation
│   │   └── boostsDatabase.ts
│   ├── preload/
│   │   ├── index.ts        # orbApi surface exposed to renderer
│   │   ├── types.ts        # ExposedApi TypeScript type
│   │   └── webview.ts      # WebView-specific preload
│   ├── renderer/
│   │   ├── App.tsx         # App shell, keyboard shortcuts
│   │   ├── styles/globals.css  # Warm monochrome design tokens
│   │   └── components/     # NavigationBar, AddressBar, TabBar, ...
│   ├── ad-blocker/
│   ├── boosts-engine/
│   ├── data-importer/
│   └── shared/
├── website/                # Next.js landing page
└── docs/                   # REA findings (Arc reference)
```

---

## Privacy

Orb's privacy is real, not performative:

- **Filter list parser** Proper EasyList/uBlock syntax: `||domain.com^` network rules, `/regex/` patterns, `$options` modifiers, `$domain=`/`~domain=` restriction, cosmetic `##selector` / `##+regex` element hiding, `@@` allowlist exceptions.
- **Ad blocking** EasyList, uBlock Origin, EasyPrivacy, CookieMonster subscriptions.
- **Third-party cookies** Blocked by default, with per-site exceptions.
- **Fingerprinting protection** Strips `Sec-CH-UA*`, `X-Client-Data`, `X-Requested-With`, and other client-hint headers.
- **HTTPS-only mode** Automatic HTTP → HTTPS upgrades with per-site exceptions.
- **Blocked-request audit log** See what was blocked and why.

---

## Contributing

- Keep commits small and granular one feature area per commit.
- Push completed checkpoints to `origin/main`.
- Run `npm run typecheck`, `npm run build`, and `npm test` before pushing.
- Preserve user data when changing persisted Zustand stores; add versioned migrations when stored shapes change.
- Keep browser navigation and privacy behavior in the Electron main process; expose renderer capabilities through the typed preload API.
- Do not create release packages unless explicitly requested.

---

## License

MIT
