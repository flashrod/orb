'use client';

import { useScrollReveal } from '@/lib/useScrollReveal';

type Feature = {
  icon: React.ElementType;
  title: string;
  description: string;
  span?: number;
  rowSpan?: number;
};

function SpacesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 3H3c-1.1 0-2 .9-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-1 16H4V4h16v16zM8 10h4l3 3-3 3H8z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="2" />
      <path d="M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

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
      <path d="M3 3h18v18H3zM7 7h2v2H7zM15 7h2v2h-2zM15 15h2v2h-2zM7 15h2v2H7z" />
    </svg>
  );
}

type FeatureData = {
  icon: React.ElementType;
  title: string;
  description: string;
  span?: number;
  rowSpan?: number;
};

const features: FeatureData[] = [
  {
    icon: SpacesIcon,
    title: 'Spaces',
    description:
      'Named, color-coded spaces isolate tabs, bookmarks, and history by context. Each space gets its own profile partition for cookie and storage isolation.',
    span: 2,
    rowSpan: 2,
  },
  {
    icon: GlobeIcon,
    title: 'Boosts',
    description:
      'Inject custom CSS and JavaScript into any site with an intelligent element picker. Hide cookie banners, reshape layouts, strip autoplaying videos.',
    span: 1,
    rowSpan: 1,
  },
  {
    icon: ShieldIcon,
    title: 'Ad + tracker blocking',
    description:
      'EasyList, uBlock Origin, EasyPrivacy, and CookieMonster rules compiled at launch. Blocked requests are logged so you can see what was stopped.',
    span: 1,
    rowSpan: 1,
  },
  {
    icon: SplitViewIcon,
    title: 'Split view',
    description: 'View two tabs side by side with a draggable divider. Swap panes or close split view with keyboard control.',
    span: 1,
    rowSpan: 1,
  },
  {
    icon: TabGroupsIcon,
    title: 'Tab groups',
    description: 'Collapse and rename tab groups. Drag tabs between groups. Persist across restarts with their own color and name.',
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
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={`card reveal col-span-${feature.span ?? 1} row-span-${feature.rowSpan ?? 1}`}
                style={{ animationDelay: `${features.indexOf(feature) * 100}ms` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-md bg-orb-accent-soft flex items-center justify-center text-orb-accent">
                    <Icon />
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
