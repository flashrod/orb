'use client';

import { useScrollReveal } from '@/lib/useScrollReveal';
import Link from 'next/link';

const LogoMark = ({ className }: { className?: string }) => (
  <svg width="40" height="40" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="2.5" />
    <path d="M14 8a6 6 0 1 0 0 12a6 6 0 0 0 0-12Z" stroke="currentColor" strokeWidth="2.5" />
    <path d="M14 14a2.5 2.5 0 1 0 0 5a2.5 2.5 0 0 0 0-5Z" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export default function Hero() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="relative pt-40 pb-32 px-6 overflow-hidden">
      <div className="ambient-blob" aria-hidden="true" />
      <div ref={ref} className={`relative max-w-7xl mx-auto text-center ${isVisible ? 'visible' : ''} reveal`}>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orb-accent-soft text-orb-accent text-[10px] font-bold mb-10">
          <span className="w-2 h-2 rounded bg-current animate-pulse"></span>
          Public beta coming soon
        </div>
        <h1 className="text-6xl md:text-8xl font-serif font-bold text-orb-text-strong leading-tight mb-8">
          <LogoMark className="inline-block mr-3 align-bottom" /> Orb
        </h1>
        <p className="text-xl md:text-2xl text-orb-text mb-10 max-w-4xl mx-auto leading-relaxed">
          A calm browser for every platform. Orb keeps your tabs, bookmarks, and history separate by
          context. Real ad and tracker blocking with EasyList and uBlock rules.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="#waitlist" className="btn-primary">
            Download
          </Link>
          <Link
            href="https://github.com/flashrod/orb"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            View on GitHub
          </Link>
        </div>
        <div className="mt-20 flex flex-wrap justify-center gap-8 text-xs text-orb-text-muted uppercase tracking-[0.15em]">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-lg border border-orb-border flex items-center justify-center text-[10px]">⌘T</span>
            <span>Command Bar</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-lg border border-orb-border flex items-center justify-center text-[10px]">Spaces</span>
            <span>Tab isolation</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-lg border border-orb-border flex items-center justify-center text-[10px]">Boosts</span>
            <span>Custom CSS/JS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-lg border border-orb-border flex items-center justify-center text-[10px]">Privacy</span>
            <span>Default-deny</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-lg border border-orb-border flex items-center justify-center text-[10px]">macOS · Win · Lin</span>
            <span>All platforms</span>
          </div>
        </div>
      </div>
    </section>
  );
}
