'use client';

import { ArrowUpRight, Plus } from '@phosphor-icons/react';
import Reveal from '@/components/Reveal';
import { faqs } from '@/lib/content';

export default function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-4xl">
        <Reveal className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">
            FAQ
          </p>
          <h2
            id="faq-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-ink md:text-4xl"
          >
            Questions worth asking.
          </h2>
          <p className="mt-4 text-lg text-muted">
            The short answers. If one is missing, the repository is the next place to look.
          </p>
        </Reveal>

        <Reveal delay={100} className="mt-12 space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="faq-item rounded-2xl border border-line bg-surface p-6 transition-colors duration-700 ease-fluid hover:border-accent/40"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-left text-lg font-semibold text-ink">
                {faq.question}
                <Plus
                  className="faq-plus h-5 w-5 shrink-0 text-muted transition-transform duration-700 ease-fluid"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-3 text-base text-muted">{faq.answer}</p>
            </details>
          ))}
        </Reveal>

        <Reveal delay={150} className="mt-8">
          <a
            href="https://github.com/flashrod/orb/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-accent-strong transition-colors duration-700 ease-fluid hover:text-ink"
          >
            Ask a question on GitHub
            <ArrowUpRight
              className="h-4 w-4 transition-transform duration-700 ease-fluid group-hover:translate-x-1 group-hover:-translate-y-1"
              aria-hidden="true"
            />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
