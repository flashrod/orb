'use client';

import {
  ArrowUpRight,
  Cookie,
  Fingerprint,
  ListMagnifyingGlass,
  ShieldCheck,
} from '@phosphor-icons/react';
import Reveal from '@/components/Reveal';
import { privacyPoints } from '@/lib/content';

const icons = {
  shield: ShieldCheck,
  fingerprint: Fingerprint,
  cookie: Cookie,
  log: ListMagnifyingGlass,
} as const;

export default function PrivacySection() {
  return (
    <section id="privacy" aria-labelledby="privacy-heading" className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="rounded-2xl border border-line bg-surface p-6 md:p-12">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">
                Privacy
              </p>
              <h2
                id="privacy-heading"
                className="mt-3 text-3xl font-semibold tracking-tight text-ink md:text-4xl"
              >
                Privacy is a set of decisions, not a badge.
              </h2>
              <p className="mt-4 text-lg text-muted">
                Orb does not ask you to trust a label. The blocking engine is in the repository,
                the audit log is in the app, and your browsing data stays on your machine.
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-2">
              {privacyPoints.map((point) => {
                const Icon = icons[point.icon];
                return (
                  <div key={point.title} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-ink">{point.title}</h3>
                      <p className="mt-2 text-sm text-muted">{point.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <a
              href="https://github.com/flashrod/orb/blob/main/packages/main/filterRules.ts"
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-12 inline-flex items-center gap-2 text-sm font-semibold text-accent-strong transition-colors duration-700 ease-fluid hover:text-ink"
            >
              Read the filter parser
              <ArrowUpRight
                className="h-4 w-4 transition-transform duration-700 ease-fluid group-hover:translate-x-1 group-hover:-translate-y-1"
                aria-hidden="true"
              />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
