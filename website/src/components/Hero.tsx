'use client';

import { useScrollReveal } from '@/lib/useScrollReveal';
import Link from 'next/link';

export default function Hero() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="relative pt-32 pb-24 px-6 overflow-hidden">
      <div ref={ref} className={`max-w-4xl mx-auto text-center ${isVisible ? 'visible' : ''} reveal`}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-orb-accent-soft text-orb-accent text-[10px] font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded bg-current animate-pulse"></span>
          macOS first — public beta soon
        </div>
        <h1 className="text-5xl md:text-7xl font-semibold text-orb-text-strong leading-tight mb-6">
          A calm, private browser for macOS
        </h1>
        <p className="text-lg md:text-xl text-orb-text mb-10 max-w-2xl mx-auto leading-relaxed">
          Orb keeps your tabs, bookmarks, and history separate by context. Real ad and tracker blocking with EasyList and uBlock rules. A warm monochrome interface you can restyle completely.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="#waitlist" className="btn-primary">
            Join the waitlist
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
      </div>
    </section>
  );
}
