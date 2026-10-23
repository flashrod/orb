'use client';

import { useScrollReveal } from '@/lib/useScrollReveal';
import { Eye, Lock, Bug, Globe } from '@phosphor-icons/react';

type PrivacyItem = {
  icon: React.ElementType;
  title: string;
  description: string;
};

const privacyItems: PrivacyItem[] = [
  {
    icon: Eye,
    title: 'Ad + tracker blocking',
    description: 'Real EasyList and uBlock rules. Blocked requests are logged so you can see what was stopped.',
  },
  {
    icon: Lock,
    title: 'Third-party cookies',
    description: 'Blocked by default. Per-site exceptions for login and payment providers.',
  },
  {
    icon: Bug,
    title: 'Fingerprinting protection',
    description: 'Client-hint headers stripped. Consistent fingerprint across sessions.',
  },
  {
    icon: Globe,
    title: 'HTTPS-only mode',
    description: 'HTTP upgraded to HTTPS automatically. Per-site exceptions.',
  },
];

export default function Privacy() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="privacy" className="bg-orb-canvas section-padding border-t border-orb-border">
      <div ref={ref} className={`container-max ${isVisible ? 'visible' : ''} reveal`}>
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="section-number">[ 02 ]</div>
            <h2 className="section-title">Privacy that isn't slop</h2>
            <p className="text-orb-text max-w-2xl">
              Most browsers treat privacy as a toggle. Orb treats it as the default.
            </p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {privacyItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="card reveal" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-md bg-orb-accent-soft flex items-center justify-center text-orb-accent">
                    <Icon size={20} weight="bold" />
                  </div>
                  <h4 className="text-lg font-semibold">{item.title}</h4>
                </div>
                <p className="text-sm text-orb-text leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
