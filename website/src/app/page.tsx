import Link from 'next/link';
import Navbar from '@/components/Navbar';
import BrowserMockup from '@/components/BrowserMockup';
import Footer from '@/components/Footer';
import SectionHeader from '@/components/SectionHeader';
import Faq from '@/components/Faq';
import PrivacySection from '@/components/PrivacySection';
import ProofSection from '@/components/ProofSection';
import Reveal from '@/components/Reveal';
import TaglineReveal from '@/components/TaglineReveal';
import Benefits from '@/components/Benefits';
import { GLSLHills } from '@/components/ui/glsl-hills';
import { faqs, steps } from '@/lib/content';
import { release } from '@/lib/release';

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
};

const usualBrowser = [
  'One tab strip for every part of your life',
  'Context switching costs a mental reload',
  'Trackers load first, then get blocked',
  'Privacy settings live three menus deep',
];

const orbBrowser = [
  'A Space for work, reading, and everything else',
  'Switch context from one command bar',
  'Requests are blocked before they load',
  'Every privacy switch sits on one screen',
];

export const metadata = {
  title: 'Orb — a calmer, private browser for macOS',
  description:
    'Focus without the tab sprawl. Orb gives every context its own Space. Switch in one keystroke, find anything from the command bar, and block ads and trackers before they load.',
  alternates: { canonical: '/' },
};

export default function Page() {
  return (
    <>
      <Navbar />

      <main id="main-content">
        {/* Hero with GLSL Hills background — text sits on top */}
        <section id="top" aria-labelledby="hero-heading" className="relative px-6 pt-32 pb-32 md:pt-40 md:pb-40 lg:pt-48 lg:pb-48 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <GLSLHills className="w-full h-full" />
          </div>
          <div className="mx-auto max-w-6xl relative z-10">
            <Reveal className="mx-auto max-w-[680px] text-center">
              <h1
                id="hero-heading"
                className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-ink leading-[1.1]"
              >
                Your personal browser, redefined.
              </h1>
              <p className="mx-auto mt-8 max-w-[60ch] text-lg text-muted leading-7">
                Orb is a private browser for macOS that gives every context its own Space. Switch
                in one keystroke, find anything from the command bar, and block ads and trackers
                before they load.
              </p>
              <div className="mx-auto mt-12 max-w-xl text-left">
                <a
                  href={release.dmg}
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-all duration-700 ease-fluid hover:bg-accent active:scale-[0.98]"
                >
                  Download for Apple Silicon
                  <span aria-hidden="true">↓</span>
                </a>
                <a
                  href="/download"
                  className="ml-3 inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-medium text-ink transition-colors duration-700 ease-fluid hover:border-accent hover:text-accent-strong"
                >
                  First launch steps
                </a>
              </div>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-muted">
                <a
                  href="https://github.com/flashrod/orb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-700 ease-fluid hover:text-accent-strong"
                >
                  Open source under MIT
                </a>
                <span>Local data</span>
                <span>No account</span>
              </div>
            </Reveal>

            <Reveal delay={150} className="mt-20 md:mt-24 lg:mt-28">
              <BrowserMockup />
            </Reveal>
          </div>
        </section>

        <section aria-labelledby="tagline" className="px-6 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="h-px w-12 bg-line" aria-hidden="true" />
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">
              The point
            </p>
            <div className="mt-4">
              <TaglineReveal />
            </div>
          </div>
        </section>

        <section aria-labelledby="problem-heading" className="px-6 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">
                The tab problem
              </p>
              <h2
                id="problem-heading"
                className="mt-3 text-3xl font-semibold tracking-tight text-ink md:text-4xl"
              >
                Forty seven tabs is not a system.
              </h2>
              <p className="mt-4 text-lg text-muted">
                A single tab strip asks you to hold every context in one place. Work, reading, and
                the thing you meant to look up later all compete for the same row. Orb gives each
                context a room of its own, then gets out of the way.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-4 md:grid-cols-2">
              <Reveal className="h-full">
                <article className="h-full rounded-2xl border border-line bg-canvas p-6 md:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    The usual browser
                  </p>
                  <ul className="mt-6 space-y-3">
                    {usualBrowser.map((item) => (
                      <li key={item} className="flex gap-3 text-base text-muted">
                        <span
                          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-line"
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>

              <Reveal delay={100} className="h-full">
                <article className="h-full rounded-2xl border border-accent/30 bg-surface p-6 md:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">
                    Orb
                  </p>
                  <ul className="mt-6 space-y-3">
                    {orbBrowser.map((item) => (
                      <li key={item} className="flex gap-3 text-base text-ink">
                        <span
                          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent"
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            </div>
          </div>
        </section>

        <Benefits />

        <PrivacySection />
        <ProofSection />
        <Faq />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </main>

      <Footer />
    </>
  );
}
