'use client';

import {
  ArrowClockwise,
  ArrowLeft,
  ArrowRight,
  Command,
  Globe,
  LockSimple,
  MagnifyingGlass,
  Plus,
  ShieldCheck,
  SquaresFour,
} from '@phosphor-icons/react';

const tabs = [
  { title: 'Linear', host: 'linear.app', color: '#5E6AD2', active: true },
  { title: 'Figma', host: 'figma.com', color: '#F24E1E', active: false },
  { title: 'Stripe', host: 'stripe.com', color: '#635BFF', active: false },
  { title: 'Notion', host: 'notion.so', color: '#141310', active: false },
];

const sideTabs = [
  { title: 'Linear', color: '#5E6AD2' },
  { title: 'Figma', color: '#F24E1E' },
  { title: 'Stripe', color: '#635BFF' },
  { title: 'Notion', color: '#141310' },
  { title: 'Release notes', color: '#A0522D' },
];

const essentials = [
  { title: 'Linear', color: '#5E6AD2' },
  { title: 'Figma', color: '#F24E1E' },
  { title: 'Stripe', color: '#635BFF' },
  { title: 'Notion', color: '#141310' },
];

const results = [
  { title: 'Linear', detail: 'Open tab', color: '#5E6AD2', selected: true },
  { title: 'Linear inbox', detail: 'History', color: '#A0522D', selected: false },
  { title: 'Reading', detail: 'Space', color: '#657A60', selected: false },
  { title: 'linear.app/inbox', detail: 'Go to address', color: '#6E6960', selected: false },
];

export default function BrowserMockup() {
  return (
    <div
      role="img"
      aria-label="The Orb browser with a tab strip, address bar, vertical tabs, and an open command bar showing a Linear tab, history, a Space, and an address."
      className="relative mx-auto max-w-5xl"
    >
      <div aria-hidden="true" className="rounded-xl border border-line bg-surface p-2">
        <div className="overflow-hidden rounded-lg border border-line bg-canvas">
          <div className="bg-surface p-2">
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-1 px-1 sm:flex">
                <span className="h-2 w-2 rounded-full bg-[#E8A19A]" />
                <span className="h-2 w-2 rounded-full bg-[#E8C98E]" />
                <span className="h-2 w-2 rounded-full bg-[#A8C9A0]" />
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
                {tabs.map((tab, index) => (
                  <div
                    key={tab.title}
                    className={`flex h-8 min-w-0 items-center gap-2 rounded-md border px-2 text-xs ${
                      index > 0 ? 'hidden sm:flex' : ''
                    } ${
                      tab.active
                        ? 'w-32 border-line bg-canvas font-medium text-ink'
                        : 'w-28 border-transparent text-muted'
                    }`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: tab.color }}
                    />
                    <span className="truncate">{tab.title}</span>
                  </div>
                ))}
              </div>

              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted">
                <Plus className="h-4 w-4" />
              </span>
            </div>
          </div>

          <div className="bg-surface px-2 pb-2">
            <div className="flex items-center gap-1">
              <div className="hidden items-center gap-1 sm:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-md text-muted">
                  <ArrowLeft className="h-4 w-4" />
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-md text-muted">
                  <ArrowRight className="h-4 w-4" />
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-md text-muted">
                  <ArrowClockwise className="h-4 w-4" />
                </span>
              </div>

              <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-elevated px-3">
                <LockSimple className="h-4 w-4 shrink-0 text-muted" />
                <span className="truncate text-xs text-ink">linear.app/inbox</span>
                <ShieldCheck className="ml-auto h-4 w-4 shrink-0 text-accent" />
              </div>

              <div className="hidden items-center gap-1 rounded-full border border-line px-2 py-1 text-xs text-muted sm:flex">
                <SquaresFour className="h-4 w-4 text-accent" />
                Reading
              </div>

              <span className="hidden h-8 w-8 items-center justify-center rounded-full border border-line text-muted sm:flex">
                <Command className="h-4 w-4" />
              </span>
            </div>
          </div>

          <div className="flex min-h-96 bg-canvas p-2">
            <aside className="hidden w-48 shrink-0 flex-col rounded-lg border border-line bg-surface p-2 sm:flex">
              <p className="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Tabs
              </p>
              <div className="mt-2 flex flex-col gap-1">
                {sideTabs.map((tab, index) => (
                  <div
                    key={tab.title}
                    className={`flex items-center gap-2 rounded-md px-2 py-2 text-xs ${
                      index === 0 ? 'bg-accent-soft text-ink' : 'text-muted'
                    }`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: tab.color }}
                    />
                    <span className="min-w-0 flex-1 truncate">{tab.title}</span>
                    {index === 0 ? <span className="h-1 w-1 rounded-full bg-accent" /> : null}
                  </div>
                ))}
              </div>

              <div className="mt-auto rounded-md border border-line bg-canvas p-2">
                <p className="text-xs font-semibold text-ink">Privacy</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                  <ShieldCheck className="h-4 w-4 text-accent" />
                  1,247 blocked
                </p>
              </div>
            </aside>

            <div className="relative min-w-0 flex-1 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">
                  <SquaresFour className="h-4 w-4" />
                  Reading
                </div>
                <div className="flex items-center gap-1 rounded-full bg-surface px-2 py-1 text-xs text-muted">
                  <ShieldCheck className="h-4 w-4 text-accent" />
                  1,247 blocked
                </div>
              </div>

              <h3 className="mt-6 text-2xl font-semibold tracking-tight text-ink">
                A little room to think.
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted">
                Your browser, arranged around what matters in this space.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {essentials.map((site) => (
                  <div
                    key={site.title}
                    className="flex items-center gap-2 rounded-lg border border-line bg-surface p-2 text-xs text-ink"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: site.color }}
                    />
                    <span className="truncate">{site.title}</span>
                  </div>
                ))}
              </div>

              <div
                aria-hidden="true"
                className="absolute inset-0 bg-canvas/60 backdrop-blur-sm"
              />

              <div className="absolute inset-x-3 bottom-3 z-10 sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2">
                <div className="overflow-hidden rounded-xl border border-line bg-elevated shadow-2xl">
                  <div className="flex items-center gap-2 bg-canvas p-2">
                    <MagnifyingGlass className="h-4 w-4 shrink-0 text-accent" />
                    <span className="text-sm text-ink">lin</span>
                    <span className="ml-auto rounded border border-line bg-surface px-2 py-0.5 font-mono text-xs text-muted">
                      ⌘K
                    </span>
                  </div>

                  <div className="p-1">
                    {results.map((result) => (
                      <div
                        key={result.title}
                        className={`flex items-center gap-2 rounded-md px-2 py-2 text-xs ${
                          result.selected
                            ? 'bg-accent-soft text-ink'
                            : 'text-muted'
                        }`}
                      >
                        {result.detail === 'Go to address' ? (
                          <Globe className="h-4 w-4 shrink-0" />
                        ) : result.detail === 'Space' ? (
                          <SquaresFour className="h-4 w-4 shrink-0" />
                        ) : (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: result.color }}
                          />
                        )}
                        <span className="min-w-0 flex-1 truncate">{result.title}</span>
                        <span
                          className={`shrink-0 ${result.selected ? 'text-accent-strong' : 'text-muted'}`}
                        >
                          {result.detail}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between px-2 py-2 text-xs text-muted">
                    <span>↑↓ to move</span>
                    <span>↵ to open</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
