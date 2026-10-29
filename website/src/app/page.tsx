import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SectionHeader from '@/components/SectionHeader';
import FeaturesBento from '@/components/FeaturesBento';
import { GLSLHills } from '@/components/ui/glsl-hills';
import Reveal from '@/components/Reveal';
import Faq from '@/components/Faq';
import PrivacySection from '@/components/PrivacySection';
import { faqs } from '@/lib/content';
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
        {/* Hero with GLSL Hills background */}
        <section id="top" aria-labelledby="hero-heading" className="relative px-6 pt-20 pb-32 md:pt-24 md:pb-40 lg:pt-28 lg:pb-48 overflow-hidden">
          <GLSLHills className="w-full h-full" />
          <div className="relative z-10 mx-auto max-w-6xl">
            <Reveal className="mx-auto max-w-[680px] text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">
                ALPHA · {release.version}
              </p>
              <h1
                id="hero-heading"
                className="mt-4 text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tight text-ink leading-[1.1]"
              >
                Focus without the tab sprawl.
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
          </div>
        </section>

        {/* Features bento grid */}
        <FeaturesBento />

        {/* First launch / onboarding note */}
        <section className="px-6 pb-24 pt-24 md:pb-32 md:pt-32">
          <div className="mx-auto max-w-3xl rounded-3xl border border-line bg-surface p-6 md:p-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">
              Unsigned build — first launch
            </p>
            <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-ink">
              Orb isn't signed or notarized yet.
            </h2>
            <p className="mt-4 max-w-[62ch] mx-auto text-base text-muted leading-7">
              macOS blocks unsigned apps on first launch. After downloading the DMG:
            </p>
            <ol className="mt-6 space-y-3 text-left mx-auto max-w-xs">
              <li className="flex gap-3 text-base text-muted">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">
                  1
                </span>
                <span>Open the DMG and drag Orb into Applications.</span>
              </li>
              <li className="flex gap-3 text-base text-muted">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">
                  2
                </span>
                <span>Open Orb once. macOS will refuse it the first time.</span>
              </li>
              <li className="flex gap-3 text-base text-muted">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">
                  3
                </span>
                <span>
                  Allow it in <strong>System Settings → Privacy & Security → Open Anyway</strong>, or run:
                </span>
              </li>
            </ol>
            <code className="mt-4 inline-block bg-neutral-100 dark:bg-neutral-900 px-3 py-1.5 rounded text-xs font-mono text-neutral-600 dark:text-neutral-400">
              xattr -dr com.apple.quarantine /Applications/Orb.app
            </code>
            <p className="mt-4 text-xs text-muted">
              You'll need to do this again each time you replace the app with a newer build.
            </p>
          </div>
        </section>

        {/* GitHub star / repo section */}
        <section className="px-6 pb-24 pt-16 md:pb-24 md:pt-16">
          <div className="mx-auto max-w-2xl">
            <a
              href="https://github.com/flashrod/orb"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-full border border-line bg-surface px-6 py-4 text-sm font-medium text-ink transition-colors duration-700 ease-fluid hover:border-accent hover:bg-surface-hover group"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                className="group-hover:text-accent-strong transition-colors"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C-4.422 18.01-3.366 17.15-3.366 17.15c-1.058-.616.002-.575.002-.575 1.24.084 1.898 1.128 1.898 1.128 1.07 1.635 2.909 1.164 2.909 1.164 2.095 2.704 6.422 1.927 7.982 1.417.425-1.118 1.22-1.657 2.086-1.657.471-.091.854-.417 1.121-.794.249-.226.478-.646.67-.999-.268-.969-.684-1.442-.863-1.905-4.44-.504-7.532-2.467-7.532-9.942 0-2.195.767-4.113 2.03-5.574-.193-.497-.82-1.815.067-2.555 0 0 .666-.214 2.182.814.675-.178 1.4-.267 2.084-.279.684-.012 1.41.098 2.084.279 1.516-1.028 2.182-.814 2.182-.814.887.74.261 2.058.067 2.555 1.264 1.461 2.03 3.379 2.03 5.574 0 7.474-3.094 9.438-7.532 9.942.584.647.947 1.515.947 2.601 0 1.878-.012 3.389-.012 3.863 0 .318.216.692.82.577C19.562 21.797 23 17.298 23 12c0-6.627-5.374-12-12-12" />
              </svg>
              <span>Star Orb on GitHub →</span>
            </a>
          </div>
        </section>

        <PrivacySection />
        <Faq />
      </main>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
