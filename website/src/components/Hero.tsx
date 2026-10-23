'use client';

import { useScrollReveal } from '@/lib/useScrollReveal';
import Link from 'next/link';

export default function Hero() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="relative pt-24 pb-20 px-6 overflow-hidden">
      <div className="ambient-blob" aria-hidden="true" />
      <div ref={ref} className={`relative max-w-5xl mx-auto text-center ${isVisible ? 'visible' : ''} reveal`}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-orb-accent-soft text-orb-accent text-[10px] font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded bg-current animate-pulse"></span>
          Public beta coming soon
        </div>
        <h1 className="text-5xl md:text-7xl font-serif font-semibold text-orb-text-strong leading-tight mb-6">
          A calm, private browser for every platform
        </h1>
        <p className="text-lg md:text-xl text-orb-text mb-10 max-w-3xl mx-auto leading-relaxed">
          Orb keeps your tabs, bookmarks, and history separate by context. Real ad and tracker blocking with EasyList and uBlock rules. A warm monochrome interface you can restyle completely.
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
        <div className="mt-16 flex flex-wrap justify-center gap-8 text-xs text-orb-text-muted">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-md border border-orb-border flex items-center justify-center text-[10px]">⌘T</span>
            <span>Command Bar</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-md border border-orb-border flex items-center justify-center text-[10px]">Spaces</span>
            <span>Tab isolation</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-md border border-orb-border flex items-center justify-center text-[10px]">Boosts</span>
            <span>Custom CSS/JS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-md border border-orb-border flex items-center justify-center text-[10px]">Privacy</span>
            <span>Default-deny</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-md border border-orb-border flex items-center justify-center text-[10px]">macOS · Win · Linux</span>
            <span>All platforms</span>
          </div>
        </div>
      </div>
    </section>
  );
}
