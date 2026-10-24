'use client';

import Link from 'next/link';

export default function DocsPage() {
  return (
    <section className="section-padding">
      <div className="container-max reveal">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between mb-12 gap-6">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-xs text-orb-text-muted uppercase tracking-widest hover:text-orb-accent transition-colors mb-4">
              <span>←</span> Back to Orb
            </Link>
            <div className="section-number">Docs</div>
            <h1 className="text-5xl md:text-7xl font-serif font-semibold text-orb-text-strong leading-tight mb-4">
              Technical Documentation
            </h1>
            <p className="text-lg text-orb-text max-w-3xl">
              Everything under the hood: architecture, privacy engine, tab management, Boosts,
              and Arc import.
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-3 px-4 py-3 rounded-lg border border-orb-border bg-orb-surface">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orb-text-muted flex-shrink-0">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="Search docs…" className="bg-transparent border-0 text-xs text-orb-text focus:outline-none w-32" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="space-y-20">
            <section id="stack" className="reveal">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orb-accent">
                    <path d="M12 1L3 5v6c0 5.6 5 9 9 9s9-3.4 9-9V5l-9-4z" />
                  </svg>
                  <h2 className="text-2xl font-serif font-semibold">Tech Stack</h2>
                </div>
                <a href="#stack" className="text-xs text-orb-text-muted hover:text-orb-accent transition-colors">Link to section →</a>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  ['Engine', 'Chromium via Electron 30.5.1'],
                  ['Shell', 'Electron + TypeScript'],
                  ['UI', 'React 18 (TSX)'],
                  ['Build', 'Vite 5'],
                  ['Styling', 'Tailwind CSS 3 (PostCSS)'],
                  ['State', 'Zustand 4 (localStorage)'],
                  ['Storage', 'localStorage (SQLite planned)'],
                  ['Packaging', 'electron-builder'],
                ].map(([label, value], i) => (
                  <div key={i} className="card">
                    <p className="text-[10px] text-orb-text-muted uppercase tracking-widest mb-2">
                      {label}
                    </p>
                    <p className="text-sm font-mono text-orb-text-strong">{value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-8 text-sm text-orb-text leading-relaxed">
                Orb is built clean-room from reverse-engineered design patterns, not Arc's code.
                No Arc code was copied.
              </p>
            </section>
          </div>

          <aside className="hidden lg:block lg:col-span-3">
            <nav className="sticky top-24 h-[calc(100vh-192px)] overflow-y-auto pr-4">
              <h5 className="text-[10px] text-orb-text-muted uppercase tracking-widest mb-4">On this page</h5>
              <ul className="space-y-2">
                {[
                  { id: 'stack', label: 'Tech Stack' },
                  { id: 'privacy', label: 'Privacy Engine' },
                  { id: 'tabs', label: 'Tabs & Spaces' },
                  { id: 'boosts', label: 'Boosts Engine' },
                  { id: 'import', label: 'Arc Data Import' },
                  { id: 'dev', label: 'Development' },
                ].map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className={`block text-sm px-3 py-1.5 rounded-md transition-colors text-orb-text-muted hover:bg-orb-surface hover:text-orb-text-strong`}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </div>
      </div>
    </section>
  );
}
