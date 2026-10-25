'use client';

import {
  Command,
  CursorClick,
  Palette,
  ShieldCheck,
  SquaresFour,
} from '@phosphor-icons/react';
import Reveal from '@/components/Reveal';
import { benefits } from '@/lib/content';

const icons = {
  spaces: SquaresFour,
  command: Command,
  shield: ShieldCheck,
  cursor: CursorClick,
  palette: Palette,
} as const;

export default function Benefits() {
  return (
    <section id="product" aria-labelledby="product-heading" className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">
            Product
          </p>
          <h2
            id="product-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-ink md:text-4xl"
          >
            What Orb changes about the day.
          </h2>
          <p className="mt-4 text-lg text-muted">
            No feature grid for its own sake. These are the parts of Orb that remove friction,
            in the order you will feel them.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit, index) => {
            const Icon = icons[benefit.icon];
            return (
              <Reveal
                key={benefit.id}
                delay={index * 50}
                className={`h-full ${index === 0 ? 'lg:col-span-2' : ''}`}
              >
                <article className="flex h-full flex-col rounded-2xl border border-line bg-surface p-6 transition-colors duration-700 ease-fluid hover:border-accent/40 md:p-8">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>

                  <h3 className="mt-6 text-xl font-semibold tracking-tight text-ink">
                    {benefit.title}
                  </h3>
                  <p className="mt-3 text-base text-muted">{benefit.body}</p>

                  {benefit.id === 'spaces' ? (
                    <div className="mt-6 flex flex-wrap gap-2">
                      <span className="rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-medium text-accent-strong">
                        Work
                      </span>
                      <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">
                        Reading
                      </span>
                      <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">
                        Personal
                      </span>
                    </div>
                  ) : null}

                  {benefit.id === 'command' ? (
                    <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="rounded-md border border-line bg-canvas px-2 py-1 font-mono text-xs text-ink">
                        ⌘
                      </span>
                      <span>+</span>
                      <span className="rounded-md border border-line bg-canvas px-2 py-1 font-mono text-xs text-ink">
                        T
                      </span>
                      <span className="ml-2">then type a tab, Space, or address</span>
                    </div>
                  ) : null}

                  {benefit.id === 'blocking' ? (
                    <div className="mt-6 flex flex-wrap gap-2">
                      {['EasyList', 'uBlock Origin', 'EasyPrivacy', 'CookieMonster'].map((list) => (
                        <span
                          key={list}
                          className="rounded-full border border-line bg-canvas px-3 py-1 text-xs text-muted"
                        >
                          {list}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {benefit.id === 'themes' ? (
                    <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted">
                      {[
                        ['Paper', '#F4F1EA'],
                        ['Sage', '#E1E7DE'],
                        ['Night', '#292825'],
                      ].map(([name, color]) => (
                        <span key={name} className="flex items-center gap-2">
                          <span
                            className="h-4 w-4 rounded-full border border-line"
                            style={{ backgroundColor: color }}
                          />
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
