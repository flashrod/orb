'use client';

import { ArrowUpRight, Check, Minus } from '@phosphor-icons/react';
import Reveal from '@/components/Reveal';
import { betaItems, notYetItems } from '@/lib/content';

export default function ProofSection() {
  return (
    <section aria-labelledby="proof-heading" className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">
              Built in the open
            </p>
            <h2
              id="proof-heading"
              className="mt-3 text-3xl font-semibold tracking-tight text-ink md:text-4xl"
            >
              The honest list.
            </h2>
            <p className="mt-4 text-lg text-muted">
              Orb is in public beta. Here is what works today and what is still on the bench. A
              browser should be able to tell you both.
            </p>
            <p className="mt-4 text-base text-muted">
              The source is MIT licensed, the roadmap is public, and the waitlist asks for one
              thing: an email.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="https://github.com/flashrod/orb"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full bg-ink px-3 py-2 text-sm font-semibold text-white transition-all duration-700 ease-fluid hover:bg-accent active:scale-[0.98]"
              >
                Read the source
                <ArrowUpRight
                  className="h-4 w-4 transition-transform duration-700 ease-fluid group-hover:translate-x-1 group-hover:-translate-y-1"
                  aria-hidden="true"
                />
              </a>
              <a
                href="https://github.com/flashrod/orb/blob/main/ROADMAP.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-sm font-semibold text-ink transition-colors duration-700 ease-fluid hover:border-accent/40 hover:text-accent-strong"
              >
                Roadmap
              </a>
            </div>
          </Reveal>

          <div className="grid gap-4">
            <Reveal delay={100}>
              <div className="rounded-2xl border border-line bg-surface p-6 md:p-8">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-accent" weight="bold" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-ink">In the beta</h3>
                </div>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {betaItems.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-muted">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                        weight="bold"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="rounded-2xl border border-line bg-canvas p-6 md:p-8">
                <div className="flex items-center gap-2">
                  <Minus className="h-4 w-4 text-muted" weight="bold" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-ink">Not yet</h3>
                </div>
                <ul className="mt-6 space-y-3">
                  {notYetItems.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-muted">
                      <Minus
                        className="mt-0.5 h-4 w-4 shrink-0 text-muted"
                        weight="bold"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
