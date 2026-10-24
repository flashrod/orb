'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type DocSection = {
  id: string;
  label: string;
};

const NAV: DocSection[] = [
  { id: 'stack', label: 'Tech Stack' },
  { id: 'privacy', label: 'Privacy Engine' },
  { id: 'tabs', label: 'Tabs & Spaces' },
  { id: 'boosts', label: 'Boosts Engine' },
  { id: 'import', label: 'Arc Data Import' },
  { id: 'dev', label: 'Development' },
];

export default function DocsSidebar() {
  const [activeId, setActiveId] = useState<string>('stack');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { threshold: 0.25, rootMargin: '-20% 0% -60% 0%' },
    );

    document.querySelectorAll('section[id]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-orb-canvas/90 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-orb-surface border-r border-orb-border transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-orb-border">
          <Link href="/" className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="2" />
              <path d="M14 8a6 6 0 1 0 0 12a6 6 0 0 0 0-12Z" stroke="currentColor" strokeWidth="2" />
              <path d="M14 14a2 2 0 1 0 0 4a2 2 0 0 0 0-4Z" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <span className="font-serif font-semibold text-orb-text-strong text-xs tracking-tight">Orb</span>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-orb-text-muted hover:text-orb-text-strong transition-colors hidden md:hidden"
            aria-label="Close sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <nav className="p-6 space-y-1">
          {NAV.map((section) => (
            <div key={section.id} className="mb-4">
              <button
                onClick={() => {
                  setActiveId(section.id);
                  setOpen(false);
                  document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  activeId === section.id
                    ? 'bg-orb-accent-soft text-orb-accent border border-orb-accent/30'
                    : 'text-orb-text-muted hover:bg-orb-surface hover:text-orb-text-strong'
                }`}
              >
                {section.label}
              </button>
            </div>
          ))}
          <div className="pt-6 border-t border-orb-border text-[10px] text-orb-text-muted uppercase tracking-widest">
            Orb Browser
          </div>
        </nav>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}
    </>
  );
}
