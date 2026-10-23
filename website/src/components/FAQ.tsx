'use client';

import { useScrollReveal } from '@/lib/useScrollReveal';

type FAQ = {
  question: string;
  answer: string;
};

const faqs: FAQ[] = [
  {
    question: 'What is Orb?',
    answer:
      'Orb is an Arc-inspired browser for focus and privacy. It brings Spaces, Boosts, and a command bar to a privacy-first browser you fully control. Built clean-room from reverse-engineered design patterns, not Arc&rsquo;s code.',
  },
  {
    question: 'Is Orb open source?',
    answer:
      'Yes. Orb is MIT licensed. The source code lives at github.com/flashrod/orb. No tracking, no telemetry, no accounts.',
  },
  {
    question: 'What platforms does Orb support?',
    answer:
      'Orb is built with Electron and Chromium. We test on macOS first, but Windows and Linux builds are planned. No platform is excluded.',
  },
  {
    question: 'How does Orb block ads and trackers?',
    answer:
      'Orb uses a real EasyList/uBlock filter list parser with network rules (`||domain.com^`), regex patterns, `$options` modifiers, cosmetic `##selector` element hiding, and `@@` allowlist exceptions. Blocked requests are logged so you can see what was stopped.',
  },
  {
    question: 'Can I import my Arc data?',
    answer:
      'Yes. Orb supports importing bookmarks, tabs, spaces, and history from Arc export files. Arc is sunsetting, so we&rsquo;re building a smooth migration path for users.',
  },
  {
    question: 'What are Boosts?',
    answer:
      'Boosts are per-site custom CSS and JavaScript with an intelligent element picker. Hide cookie banners, reshape layouts, or strip noise from any site.',
  },
];

export default function FAQ() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="faq" className="section-padding border-t border-orb-border">
      <div ref={ref} className={`container-max ${isVisible ? 'visible' : ''} reveal`}>
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="section-number">[ 03 ]</div>
            <h2 className="section-title">FAQ</h2>
            <p className="text-orb-text max-w-2xl">
              Everything you need to know about Orb.
            </p>
          </div>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={faq.question} className="border-b border-orb-border pb-6 last:border-b-0 reveal" style={{ animationDelay: `${i * 60}ms` }}>
              <h3 className="text-lg font-semibold text-orb-text-strong mb-2">{faq.question}</h3>
              <p className="text-sm text-orb-text leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
