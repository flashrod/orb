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
  span?: number;
  rowSpan?: number;
};

const features: Feature[] = [
  {
    icon: Layout,
    title: 'Spaces',
    description:
      'Named, color-coded spaces isolate tabs, bookmarks, and history by context. Each space gets its own profile partition for cookie and storage isolation.',
    span: 2,
    rowSpan: 2,
  },
  {
    icon: Globe,
    title: 'Boosts',
    description:
      'Inject custom CSS and JavaScript into any site with an intelligent element picker. Hide cookie banners, reshape layouts, strip autoplaying videos.',
    span: 1,
    rowSpan: 1,
  },
  {
    icon: Shield,
    title: 'Ad + tracker blocking',
    description:
      'EasyList, uBlock Origin, EasyPrivacy, and CookieMonster rules compiled at launch. Blocked requests are logged so you can see what was stopped.',
    span: 1,
    rowSpan: 1,
  },
  {
    icon: SplitViewIcon,
    title: 'Split view',
    description:
      'View two tabs side by side with a draggable divider. Swap panes or close split view with keyboard control.',
    span: 1,
    rowSpan: 1,
  },
  {
    icon: TabGroupsIcon,
    title: 'Tab groups',
    description:
      'Collapse and rename tab groups. Drag tabs between groups. Persist across restarts with their own color and name.',
    span: 1,
    rowSpan: 1,
  },
];

export default function Features() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="features" className="section-padding border-t border-orb-border">
      <div ref={ref} className={`container-max ${isVisible ? 'visible' : ''} reveal`}>
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="section-number">[ 01 ]</div>
            <h2 className="section-title">Built for focus</h2>
            <p className="text-orb-text max-w-2xl">
              Orb is a calm browser. No dark patterns, no hidden telemetry.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 grid-auto-flow-dense">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={`card reveal col-span-${feature.span ?? 1} row-span-${feature.rowSpan ?? 1}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-md bg-orb-accent-soft flex items-center justify-center text-orb-accent">
                    <Icon size={18} weight="bold" />
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
