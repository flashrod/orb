'use client';

import Link from 'next/link';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { Shield, Globe, Layout } from '@phosphor-icons/react';

function StackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M5 20L19 4L12 9L5 4L12 13z" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 17 10 11" />
      <polyline points="14 17 20 17 20 11" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="12" y1="15" x2="12" y2="23" />
    </svg>
  );
}

function TabGroupsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function BugIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="3" />
      <path d="M5 18h14a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1z" />
      <path d="M9 15V9m3 6v-6m-2 9H9a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h2a1 1 0 0 0 1-1v-2" />
    </svg>
  );
}

export default function DocsPage() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="section-padding">
      <div className="container-max reveal">
        <div className="flex items-start justify-between mb-12">
          <div>
            <Link href="/" className="text-xs text-orb-text-muted uppercase tracking-widest hover:text-orb-accent transition-colors mb-4 inline-block">
              &larr; Back to Orb
            </Link>
            <div className="section-number">Docs</div>
            <h1 className="text-5xl md:text-7xl font-serif font-semibold text-orb-text-strong leading-tight mb-4">
              Technical Documentation
            </h1>
            <p className="text-orb-text max-w-2xl">
              Everything under the hood: architecture, privacy engine, tab management, Boosts, and Arc import.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1 hidden lg:block">
            <nav className="space-y-2">
              {[
                { id: 'stack', label: 'Tech Stack', icon: StackIcon },
                { id: 'privacy', label: 'Privacy Engine', icon: Shield },
                { id: 'tabs', label: 'Tabs & Spaces', icon: Layout },
                { id: 'boosts', label: 'Boosts Engine', icon: Globe },
                { id: 'import', label: 'Arc Data Import', icon: TabGroupsIcon },
                { id: 'dev', label: 'Development', icon: TerminalIcon },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-md text-sm text-orb-text-muted hover:bg-orb-surface hover:text-orb-accent transition-colors border border-transparent hover:border-orb-border"
                  >
                    <Icon size={14} weight="regular" />
                    {item.label}
                  </a>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <div className="lg:col-span-2 space-y-16">
            <section id="stack" className="reveal">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-6 h-6 text-orb-accent"><StackIcon /></div>
                <h2 className="text-2xl font-serif font-semibold">Tech Stack</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[['Engine', 'Chromium via Electron 30.5.1'], ['Shell', 'Electron + TypeScript'], ['UI', 'React 18 (TSX)'], ['Build', 'Vite 5'], ['Styling', 'Tailwind CSS 3 (PostCSS)'], ['State', 'Zustand 4 (localStorage)'], ['Storage', 'localStorage (SQLite planned)'], ['Packaging', 'electron-builder (DMG / EXE / AppImage / .deb)']].map(([label, value], i) => (
                  <div key={i} className="bg-orb-surface border border-orb-border rounded-lg p-6">
                    <p className="text-[10px] text-orb-text-muted uppercase tracking-widest mb-2">{label}</p>
                    <p className="text-sm font-mono text-orb-text-strong">{value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-8 text-sm text-orb-text leading-relaxed">
                Orb is built clean-room from reverse-engineered design patterns, not Arc&rsquo;s code. No Arc code was copied.
              </p>
            </section>

            <section id="privacy" className="reveal border-t border-orb-border pt-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-6 h-6 text-orb-accent"><Shield size={20} weight="bold" /></div>
                <h2 className="text-2xl font-serif font-semibold">Privacy Engine</h2>
              </div>
              <p className="text-sm text-orb-text mb-6 leading-relaxed">
                Orb&rsquo;s privacy is real, not performative. No hardcoded slop, no marketing toggles that do nothing.
              </p>
              <div className="space-y-6">
                <div className="bg-orb-surface border border-orb-border rounded-lg p-6">
                  <h4 className="text-sm font-semibold text-orb-text-strong mb-3">Filter List Parser</h4>
                  <p className="text-xs font-mono text-orb-text-muted mb-3">
                    Network rules: <code className="text-orb-accent">||domain.com^</code> with <code className="text-orb-accent">$options</code>, <code className="text-orb-accent">$domain=</code>, and <code className="text-orb-accent">~domain=</code> modifiers.
                  </p>
                  <p className="text-xs font-mono text-orb-text-muted mb-3">
                    Cosmetic rules: <code className="text-orb-accent">##selector</code> and <code className="text-orb-accent">##+regex</code> element hiding.
                  </p>
                  <p className="text-xs font-mono text-orb-text-muted mb-3">
                    Allowlist: <code className="text-orb-accent">@@</code> exceptions per domain.
                  </p>
                  <p className="text-sm text-orb-text">
                    60k+ ad network rules, 56k+ tracker rules, 28k+ cosmetic rules from EasyList, uBlock Origin, EasyPrivacy, and CookieMonster.
                  </p>
                </div>
                <div className="bg-orb-surface border border-orb-border rounded-lg p-6">
                  <h4 className="text-sm font-semibold text-orb-text-strong mb-3">Third-Party Cookies</h4>
                  <p className="text-sm text-orb-text leading-relaxed">
                    Blocked by default with built-in exceptions for common login and payment providers. One-click &ldquo;this site is broken&rdquo; toggle remembers per-site choices.
                  </p>
                </div>
                <div className="bg-orb-surface border border-orb-border rounded-lg p-6">
                  <h4 className="text-sm font-semibold text-orb-text-strong mb-3">Fingerprinting Protection</h4>
                  <p className="text-sm text-orb-text leading-relaxed">
                    Strips <code className="text-orb-accent">Sec-CH-UA*</code>, <code className="text-orb-accent">X-Client-Data</code>, <code className="text-orb-accent">X-Requested-With</code>. <code className="text-orb-accent">Accept-Language</code> trimmed to first entry.
                  </p>
                </div>
                <div className="bg-orb-surface border border-orb-border rounded-lg p-6">
                  <h4 className="text-sm font-semibold text-orb-text-strong mb-3">HTTPS-Only Mode</h4>
                  <p className="text-sm text-orb-text leading-relaxed">
                    HTTP upgraded to HTTPS automatically via <code className="text-orb-accent">redirectURL</code> with per-site exceptions.
                  </p>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-orb-border">
                <h4 className="text-sm font-semibold text-orb-text-strong mb-3 uppercase tracking-widest">The Rule</h4>
                <p className="text-sm text-orb-text leading-relaxed">
                  We never claim a privacy feature until it changes runtime behavior. If a rule is in the list, it is enforced on every request.
                </p>
              </div>
            </section>

            <section id="tabs" className="reveal border-t border-orb-border pt-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-6 h-6 text-orb-accent"><Layout size={20} weight="bold" /></div>
                <h2 className="text-2xl font-serif font-semibold">Tabs & Spaces</h2>
              </div>
              <div className="space-y-6">
                <div className="bg-orb-surface border border-orb-border rounded-lg p-6">
                  <h4 className="text-sm font-semibold text-orb-text-strong mb-3">Spaces</h4>
                  <p className="text-sm text-orb-text leading-relaxed">
                    Named, color-coded spaces isolate tabs, bookmarks, and history by context. Each space gets its own profile partition for cookie and storage isolation.
                  </p>
                </div>
                <div className="bg-orb-surface border border-orb-border rounded-lg p-6">
                  <h4 className="text-sm font-semibold text-orb-text-strong mb-3">Tab Groups</h4>
                  <p className="text-sm text-orb-text leading-relaxed">
                    Collapse and rename tab groups. Drag tabs between groups. Groups persist across restarts with their own color and name.
                  </p>
                </div>
                <div className="bg-orb-surface border border-orb-border rounded-lg p-6">
                  <h4 className="text-sm font-semibold text-orb-text-strong mb-3">Split View</h4>
                  <p className="text-sm text-orb-text leading-relaxed">
                    View two tabs side by side with a draggable divider. Swap panes or close split view with keyboard control. Works with tab groups and pinned tabs.
                  </p>
                </div>
                <div className="bg-orb-surface border border-orb-border rounded-lg p-6">
                  <h4 className="text-sm font-semibold text-orb-text-strong mb-3">Mounted Tab Architecture</h4>
                  <p className="text-sm text-orb-text leading-relaxed">
                    Tabs stay mounted when switching&mdash;inactive tabs are hidden with <code className="text-orb-accent">visibility: hidden</code> plus <code className="text-orb-accent">pointer-events: none</code>, avoiding full page reloads and preserving scroll, form input, and video playback.
                  </p>
                </div>
              </div>
            </section>

            <section id="boosts" className="reveal border-t border-orb-border pt-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-6 h-6 text-orb-accent"><Globe size={20} weight="bold" /></div>
                <h2 className="text-2xl font-serif font-semibold">Boosts Engine</h2>
              </div>
              <div className="space-y-6">
                <div className="bg-orb-surface border border-orb-border rounded-lg p-6">
                  <h4 className="text-sm font-semibold text-orb-text-strong mb-3">Element Picker</h4>
                  <p className="text-sm text-orb-text leading-relaxed">
                    Intelligent element selection using Arc-style semantic scoring: <code className="text-orb-accent">testID +1</code>, <code className="text-orb-accent">ARIA +0.8</code>, <code className="text-orb-accent">href +0.6</code>, <code className="text-orb-accent">semantic tag/role +0.5</code>, <code className="text-orb-accent">gibberish class −1</code>.
                  </p>
                </div>
                <div className="bg-orb-surface border border-orb-border rounded-lg p-6">
                  <h4 className="text-sm font-semibold text-orb-text-strong mb-3">Per-Site Storage</h4>
                  <p className="text-sm text-orb-text leading-relaxed">
                    Boosts stored per-domain with CSS and JS fields. Default cookie-banner boost included. Validation and preview in the Boosts editor UI.
                  </p>
                </div>
              </div>
            </section>

            <section id="import" className="reveal border-t border-orb-border pt-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-6 h-6 text-orb-accent"><TabGroupsIcon /></div>
                <h2 className="text-2xl font-serif font-semibold">Arc Data Import</h2>
              </div>
              <div className="space-y-6">
                <div className="bg-orb-surface border border-orb-border rounded-lg p-6">
                  <h4 className="text-sm font-semibold text-orb-text-strong mb-3">Migration Path</h4>
                  <p className="text-sm text-orb-text leading-relaxed">
                    Arc is sunsetting December 22, 2026. Orb supports importing bookmarks, tabs, spaces, and history from Arc export files for users migrating before the sunset.
                  </p>
                </div>
                <div className="bg-orb-surface border border-orb-border rounded-lg p-6">
                  <h4 className="text-sm font-semibold text-orb-text-strong mb-3">Import Pipeline</h4>
                  <p className="text-sm text-orb-text leading-relaxed">
                    Export parser &rarr; Import UI &rarr; Import execution with preview and undo. Spaces map to Orb spaces, tabs map to Orb tabs with full metadata preservation.
                  </p>
                </div>
              </div>
            </section>

            <section id="dev" className="reveal border-t border-orb-border pt-12 pb-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-6 h-6 text-orb-accent"><TerminalIcon /></div>
                <h2 className="text-2xl font-serif font-semibold">Development</h2>
              </div>
              <div className="space-y-6">
                <div className="bg-orb-surface border border-orb-border rounded-lg p-6">
                  <h4 className="text-sm font-semibold text-orb-text-strong mb-3">Getting Started</h4>
                  <p className="text-xs font-mono text-orb-text-muted mb-3">git clone https://github.com/flashrod/orb.git</p>
                  <p className="text-xs font-mono text-orb-text-muted mb-3">cd orb</p>
                  <p className="text-xs font-mono text-orb-text-muted mb-3">npm install</p>
                  <p className="text-xs font-mono text-orb-text-muted mb-3">npm run dev</p>
                  <p className="text-sm text-orb-text">
                    Starts Vite (renderer at <code className="text-orb-accent">http://localhost:5173</code>), esbuild watch (main process bundles), and Electron.
                  </p>
                </div>
                <div className="bg-orb-surface border border-orb-border rounded-lg p-6">
                  <h4 className="text-sm font-semibold text-orb-text-strong mb-3">Commands</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <code className="font-mono text-xs text-orb-accent">npm run typecheck</code>
                      <span className="text-sm text-orb-text">tsc --noEmit</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <code className="font-mono text-xs text-orb-accent">npm run build</code>
                      <span className="text-sm text-orb-text">esbuild + vite build</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <code className="font-mono text-xs text-orb-accent">npm run dist</code>
                      <span className="text-sm text-orb-text">electron-builder packaging</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <code className="font-mono text-xs text-orb-accent">npm test</code>
                      <span className="text-sm text-orb-text">vitest run</span>
                    </div>
                  </div>
                </div>
                <div className="bg-orb-surface border border-orb-border rounded-lg p-6">
                  <h4 className="text-sm font-semibold text-orb-text-strong mb-3">Commit Guidelines</h4>
                  <ul className="space-y-2 text-sm text-orb-text">
                    <li className="flex items-start gap-2"><span className="text-orb-accent">•</span> Keep commits small and granular (one feature area per commit)</li>
                    <li className="flex items-start gap-2"><span className="text-orb-accent">•</span> Push completed checkpoints to <code className="text-orb-accent">origin/main</code></li>
                    <li className="flex items-start gap-2"><span className="text-orb-accent">•</span> Run typecheck, build, and tests before pushing</li>
                    <li className="flex items-start gap-2"><span className="text-orb-accent">•</span> Preserve user data when changing persisted Zustand stores; add versioned migrations</li>
                    <li className="flex items-start gap-2"><span className="text-orb-accent">•</span> Keep navigation and privacy behavior in the Electron main process</li>
                    <li className="flex items-start gap-2"><span className="text-orb-accent">•</span> Do not create release packages unless explicitly requested</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
