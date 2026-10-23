'use client';

import { useScrollReveal } from '@/lib/useScrollReveal';
import { Eye, Link as LinkIcon, Globe, Shield } from '@phosphor-icons/react';

type PrivacyItem = {
  icon: React.ElementType;
  title: string;
  description: string;
};

const privacyItems: PrivacyItem[] = [
  {
    icon: Eye,
    title: 'Ad + tracker blocking',
    description:
      'EasyList, uBlock Origin, EasyPrivacy, and CookieMonster rules compiled at launch. Blocked requests are logged so you can see what was stopped.',
  },
  {
    icon: LinkIcon,
    title: 'Third-party cookies',
    description:
      'Blocked by default. Built-in exceptions for common login and payment providers, plus a one-click toggle per site.',
  },
  {
    icon: Globe,
    title: 'Fingerprinting protection',
    description:
      'Client-hint headers stripped. Consistent low-entropy values keep your browser fingerprint generic.',
  },
  {
    icon: Shield,
    title: 'HTTPS-only mode',
    description:
      'HTTP is upgraded to HTTPS automatically, with clean fallbacks and per-site exceptions.',
  },
];

export default function Privacy() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="privacy" className="section-padding">
      <div ref={ref} className={`container-max ${isVisible ? 'visible' : ''} reveal`}>
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl mb-4">Privacy that isn't slop</h2>
          <p className="text-orb-text max-w-2xl mx-auto">
            Most browsers treat privacy as a toggle. Orb treats it as the default.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {privacyItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="card reveal" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-md bg-orb-accent-soft flex items-center justify-center text-orb-accent">
                    <Icon size={20} weight="bold" />
                  </div>
                  <h4 className="text-sm font-semibold text-orb-text-strong">{item.title}</h4>
                </div>
                <p className="text-sm text-orb-text">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
