# Orb

A spiritual successor to Arc Browser — built clean-room from reverse-engineered design patterns, not Arc's code.

Built with **Electron + React + TypeScript + Vite + Tailwind + Zustand + SQLite**.

## Features (v1)

- **Sidebar + Spaces** — Vertical tab strip, named spaces with icons and colors
- **Command Bar** (⌘T) — Spotlight-like search with host-based dedup
- **Boosts** — Per-site custom CSS/JS with intelligent element picker
- **Ad Blocking** — EasyList, uBlock Origin, CookieMonster, EasyPrivacy subscriptions
- **Site Behavior** — Keepalive allowlist, Picture-in-Picture allow/deny lists
- **Arc Data Import** — Import bookmarks, tabs, spaces, history from Arc exports

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

## Getting Started

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build

# Package for distribution
npm run dist
```

## Project Structure

```
orb/
├── packages/main/          # Electron main process
├── packages/preload/       # Preload scripts (contextBridge)
├── packages/renderer/      # React UI
├── packages/boosts-engine/ # Boosts element picker + CSS injector
├── packages/ad-blocker/    # Filter list fetcher + URL matcher
├── packages/data-importer/ # Arc export parser
├── docs/                   # REA findings reference
└── scripts/                # Dev utilities
```

## License

MIT
