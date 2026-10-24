'use client';

import { useScrollReveal } from '@/lib/useScrollReveal';

type Feature = {
  icon: string;
  title: string;
  description: string;
  span?: number;
  rowSpan?: number;
};

const features: Feature[] = [
  {
    icon: `
      <path d="M21 3H3c-1.1 0-2 .9-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-1 16H4V4h16v16zM8 10h4l3 3-3 3H8z" fill="currentColor"/>
    `,
    title: 'Spaces',
    description: 'Named, color-coded spaces isolate tabs, bookmarks, and history by context. Each space gets its own profile partition for cookie and storage isolation.',
    span: 2,
    rowSpan: 2,
  },
  {
    icon: `
      <path d="M21 10a7 7 0 0 0-7-7H4a7 7 0 0 0-7 7v7a7 7 0 0 0 7 7h10a7 7 0 0 0 7-7z" fill="currentColor"/>
    `,
    title: 'Boosts',
    description: 'Inject custom CSS and JavaScript into any site with an intelligent element picker. Hide cookie banners, reshape layouts, strip autoplaying videos.',
    span: 1,
    rowSpan: 1,
  },
  {
    icon: `
      <path d="M9 19a9 9 0 0 1 9-9V3a9 9 0 0 1-9 9zm0 17a7 7 0 0 1-7-7V3a7 7 0 0 1 7-7V3a7 7 0 0 0-7 7v10a7 7 0 0 0 7 7z" fill="currentColor"/>
    `,
    title: 'Ad + tracker blocking',
    description: 'EasyList, uBlock Origin, EasyPrivacy, and CookieMonster rules compiled at launch. Blocked requests are logged so you can see what was stopped.',
    span: 1,
    rowSpan: 1,
  },
  {
    icon: `
      <path d="M3 3h18v18H3z" fill="none" stroke="currentColor" strokeWidth="2"/><line x1="3" y1="11" x2="21" y2="11" stroke="currentColor" strokeWidth="2"/><line x1="7" y1="3" x2="7" y2="11" stroke="currentColor" strokeWidth="2"/><line x1="14" y1="3" x2="14" y2="11" stroke="currentColor" strokeWidth="2"/></svg>
    `,
    title: 'Split view',
    description: 'View two tabs side by side with a draggable divider. Swap panes or close split view with keyboard control.',
    span: 1,
    rowSpan: 1,
  },
  {
    icon: `
      <path d="M3 3h18v18H3zM7 7h2v2H7zM15 7h2v2h-2zM15 15h2v2h-2zM7 15h2v2H7z" fill="currentColor"/>
    `,
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
            return (
              <div
                key={feature.title}
                className={`card reveal col-span-${feature.span ?? 1} row-span-${feature.rowSpan ?? 1}`}
                style={{ animationDelay: `${features.indexOf(feature) * 100}ms` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-md bg-orb-accent-soft flex items-center justify-center text-orb-accent" dangerouslySetInnerHTML={{ __html: feature.icon }} />
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
