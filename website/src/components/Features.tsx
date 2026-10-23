'use client';

import { useScrollReveal } from '@/lib/useScrollReveal';
import { Layout, Globe, Shield } from '@phosphor-icons/react';

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
    description:
      'Named, color-coded spaces isolate tabs, bookmarks, and history. Work, personal, and research never mix.',
    colSpan: 3,
  },
  {
    icon: Globe,
    title: 'Boosts',
    description:
      'Inject custom CSS and JavaScript into any site. Hide cookie banners, reshape layouts, or strip noise with an intelligent element picker.',
    colSpan: 1,
  },
  {
    icon: Shield,
    title: 'Privacy',
    description:
      'Ad and tracker blocking, third-party cookies blocked by default, fingerprinting protection, and HTTPS-only mode.',
    colSpan: 2,
  },
  {
    icon: Layout,
    title: 'Split view',
    description:
      'View two tabs side by side with a draggable divider. Swap panes or close split view with keyboard control.',
    colSpan: 2,
  },
];

export default function Features() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="features" className="bg-orb-surface section-padding">
      <div ref={ref} className={`container-max ${isVisible ? 'visible' : ''} reveal`}>
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl mb-4">Built for focus</h2>
          <p className="text-orb-text max-w-2xl mx-auto">
            Everything Orb does, it does transparently. No hidden telemetry, no dark patterns.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={`card col-span-${feature.colSpan} reveal`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-md bg-orb-accent-soft flex items-center justify-center text-orb-accent">
                    <Icon size={20} weight="bold" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                </div>
                <p className="text-sm text-orb-text">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
