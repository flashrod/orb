'use client';

import { useScrollReveal } from '@/lib/useScrollReveal';
import { Eye, Lock, Bug, Globe } from '@phosphor-icons/react';

type PrivacyItem = {
  icon: React.ElementType;
  title: string;
  description: string;
  details?: string[];
};

const privacyItems: PrivacyItem[] = [
  {
    icon: Eye,
    title: 'Ad + tracker blocking',
    description:
      'EasyList, uBlock Origin, EasyPrivacy, and CookieMonster rules compiled at launch.',
    details: [
      'Network rules: ||domain.com^ with $options, $domain=, and ~domain= modifiers',
      'Cosmetic rules: ##selector and ##+regex element hiding',
      'Allowlist: @@ exceptions per domain',
      'Blocked-request audit log with reason and rule match',
    ],
  },
  {
    icon: Lock,
    title: 'Third-party cookies',
    description:
      'Blocked by default with built-in exceptions for common login and payment providers.',
    details: [
      'Default-deny for third-party Cookie and Set-Cookie headers',
      'Built-in exceptions for SSO and payment providers',
      'One-click “this site is broken” toggle remembers per site',
      'Permission handler prompts before granting sensitive access',
    ],
  },
  {
    icon: Bug,
    title: 'Fingerprinting protection',
    description:
      'Client-hint headers stripped or normalized to low-entropy values.',
    details: [
      'Strips Sec-CH-UA, Sec-CH-UA-Mobile, Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version',
      'Strips X-Client-Data, X-Requested-With',
      'Accept-Language trimmed to first entry',
      'Consistent fingerprint across sessions — no randomized entropy',
    ],
  },
  {
    icon: Globe,
    title: 'HTTPS-only mode',
    description:
      'HTTP is upgraded to HTTPS automatically with clean fallbacks.',
    details: [
      'HTTP → HTTPS redirect via redirectURL on all navigations',
      'Per-site exceptions for legacy HTTP-only sites',
      'Clear insecure indicator in address bar',
    ],
  },
];

export default function Privacy() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="privacy" className="bg-orb-canvas section-padding border-t border-orb-border">
      <div ref={ref} className={`container-max ${isVisible ? 'visible' : ''} reveal`}>
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="section-number">[ 02 ]</div>
            <h2 className="section-title">Privacy that isn't slop</h2>
            <p className="text-orb-text max-w-2xl">
              Most browsers treat privacy as a toggle. Orb treats it as the default.
            </p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {privacyItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="card reveal" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-md bg-orb-accent-soft flex items-center justify-center text-orb-accent">
                    <Icon size={18} weight="bold" />
                  </div>
                  <h4 className="text-lg font-semibold">{item.title}</h4>
                </div>
                <p className="text-sm text-orb-text mb-4 leading-relaxed">{item.description}</p>
                {item.details && (
                  <ul className="text-[11px] text-orb-text-muted space-y-1.5">
                    {item.details.map((d, j) => (
                      <li key={j} className="flex items-start gap-1.5">
                        <span className="text-orb-accent">•</span> {d}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-10 pt-10 border-t border-orb-border">
          <h4 className="text-sm font-semibold text-orb-text-strong mb-3 uppercase tracking-widest">
            The rule
          </h4>
          <p className="text-sm text-orb-text leading-relaxed">
            We never claim a privacy feature until it changes runtime behavior. No hardcoded slop,
            no marketing toggles that do nothing. If a rule is in the list, it is enforced on every
            request.
          </p>
        </div>
      </div>
    </section>
  );
}
