'use client';

import { useScrollReveal } from '@/lib/useScrollReveal';

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F0F0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F0F0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function BugIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F0F0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="3" />
      <path d="M5 18h14a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F0F0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" stroke="#0F0F0F" strokeWidth="2" />
      <line x1="12" y1="2" x2="12" y2="22" stroke="#0F0F0F" strokeWidth="2" />
      <path d="M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="#0F0F0F" strokeWidth="2" />
    </svg>
  );
}

type PrivacyItem = {
  icon: React.ElementType;
  title: string;
  description: string;
  details?: string[];
};

const privacyItems: PrivacyItem[] = [
  {
    icon: EyeIcon,
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
    icon: LockIcon,
    title: 'Third-party cookies',
    description:
      'Blocked by default with built-in exceptions for common login and payment providers.',
    details: [
      'Default-deny for third-party Cookie and Set-Cookie headers',
      'Built-in exceptions for SSO and payment providers',
      'One-click "this site is broken" toggle remembers per site',
      'Permission handler prompts before granting sensitive access',
    ],
  },
  {
    icon: BugIcon,
    title: 'Fingerprinting protection',
    description: 'Client-hint headers stripped or normalized to low-entropy values.',
    details: [
      'Strips Sec-CH-UA, Sec-CH-UA-Mobile, Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version',
      'Strips X-Client-Data, X-Requested-With',
      'Accept-Language trimmed to first entry',
      'Consistent fingerprint across sessions — no randomized entropy',
    ],
  },
  {
    icon: GlobeIcon,
    title: 'HTTPS-only mode',
    description: 'HTTP upgraded to HTTPS automatically with clean fallbacks.',
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
    <section id="privacy" className="bg-[#F0EEE6] section-padding border-t border-[#CFC7BA]">
      <div ref={ref} className={`container-max ${isVisible ? 'visible' : ''} reveal`}>
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="section-number">[ 02 ]</div>
            <h2 className="section-title">Privacy that isn't slop</h2>
            <p className="text-[#2A2A2A] max-w-2xl">
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
                  <div className="w-8 h-8 rounded-md bg-[#A0522D]15 flex items-center justify-center text-[#A0522D]">
                    <Icon />
                  </div>
                  <h4 className="text-lg font-semibold">{item.title}</h4>
                </div>
                <p className="text-sm text-[#2A2A2A] mb-4 leading-relaxed">{item.description}</p>
                {item.details && (
                  <ul className="text-[11px] text-[#6E6B65] space-y-1.5">
                    {item.details.map((d, j) => (
                      <li key={j} className="flex items-start gap-1.5">
                        <span className="text-[#A0522D]">•</span> {d}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-12 pt-12 border-t border-[#CFC7BA]">
          <h4 className="text-sm font-semibold text-[#0F0F0F] mb-3 uppercase tracking-widest">The rule</h4>
          <p className="text-sm text-[#2A2A2A] leading-relaxed">
            We never claim a privacy feature until it changes runtime behavior. No hardcoded slop,
            no marketing toggles that do nothing. If a rule is in the list, it is enforced on every
            request.
          </p>
        </div>
      </div>
    </section>
  );
}
