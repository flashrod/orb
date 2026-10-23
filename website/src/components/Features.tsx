'use client';

import { useScrollReveal } from '@/lib/useScrollReveal';
import { Layout, Globe, Shield } from '@phosphor-icons/react';

function SplitViewIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function TabGroupsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    </svg>
  );
}

type Feature = {
  icon: React.ElementType;
  title: string;
  description: string;
  colSpan?: number;
};

const features: Feature[] = [
  {
    icon: Layout,
    title: 'Spaces',
    description: 'Named spaces keep your tabs, bookmarks, and history separate by context.',
    colSpan: 2,
  },
  {
    icon: Globe,
    title: 'Boosts',
    description: 'Custom CSS and JS for any site. Hide cookie banners, reshape layouts, dark-mode the web.',
    colSpan: 2,
  },
  {
    icon: Shield,
    title: 'Ad + tracker blocking',
    description: 'Real EasyList and uBlock rules. Third-party cookies blocked by default.',
    colSpan: 1,
  },
  {
    icon: SplitViewIcon,
    title: 'Split view',
    description: 'Two tabs side by side with a draggable divider.',
    colSpan: 1,
  },
  {
    icon: TabGroupsIcon,
    title: 'Tab groups',
    description: 'Collapse, rename, and reorder tab groups that persist across restarts.',
    colSpan: 1,
  },
];

export default function Features() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="features" className="section-padding border-t border-orb-border">
      <div ref={ref} className={`container-max ${isVisible ? 'visible' : ''} reveal`}>
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="section-number">[ 01 ]</div>
            <h2 className="section-title">Built for focus</h2>
            <p className="text-orb-text max-w-2xl">
              Orb is a calm browser. No dark patterns, no hidden telemetry.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={`card col-span-${feature.colSpan} reveal`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-md bg-orb-accent-soft flex items-center justify-center text-orb-accent">
                    <Icon size={20} weight="bold" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                </div>
                <p className="text-sm text-orb-text leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
