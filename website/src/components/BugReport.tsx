'use client';

import { useScrollReveal } from '@/lib/useScrollReveal';

export default function BugReport() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="section-padding border-t border-orb-border">
      <div ref={ref} className={`container-max ${isVisible ? 'visible' : ''} reveal`}>
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="md:w-1/2">
            <h2 className="text-4xl md:text-5xl font-serif font-semibold text-orb-text-strong mb-4">
              Found something rough?
            </h2>
            <p className="text-orb-text mb-6 leading-relaxed">
              Orb is in active development. If you hit a bug, a visual glitch, or a site that doesn&rsquo;t load right, tell us on GitHub. Steps to reproduce and screenshots help enormously.
            </p>
            <a
              href="https://github.com/flashrod/orb/issues/new/choose"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-orb-accent font-medium text-sm hover:underline"
            >
              File a bug on GitHub &rarr;
            </a>
          </div>
          <div className="md:w-1/2 p-8 rounded-lg border border-orb-border bg-orb-surface">
            <h4 className="text-sm font-semibold text-orb-text-strong mb-3 uppercase tracking-widest">
              What to include
            </h4>
            <ul className="space-y-3 text-sm text-orb-text">
              <li className="flex items-start gap-2">
                <span className="text-orb-accent">•</span> Steps to reproduce
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orb-accent">•</span> What you expected vs what happened
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orb-accent">•</span> macOS version and Orb build
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orb-accent">•</span> Screenshot or screen recording
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orb-accent">•</span> Whether it happens in a specific Space or profile
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
