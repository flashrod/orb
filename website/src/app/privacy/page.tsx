import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import Logo from '@/components/Logo';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'How Orb handles waitlist email and browser data.',
};

export default function PrivacyPage() {
  return (
    <>
      <header className="px-6 pt-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            href="/"
            aria-label="Orb home"
            className="inline-flex items-center gap-2 text-ink transition-colors duration-700 ease-fluid hover:text-accent-strong"
          >
            <Logo className="h-6 w-6" />
            <span className="text-base font-semibold tracking-tight">Orb</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-muted transition-colors duration-700 ease-fluid hover:text-ink"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main id="main-content" className="px-6 pb-24 pt-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight text-ink md:text-5xl">
            Privacy policy
          </h1>
          <p className="mt-4 text-sm text-muted">Last updated October 25, 2026</p>

          <div className="legal-copy mt-12">
            <h2>What this site collects</h2>
            <p>
              This site has one form: the beta waitlist. When you submit an address, we validate it
              and send it to the waitlist provider configured for the site. The provider stores it
              so we can send your beta invite. We do not sell addresses or add them to a newsletter.
            </p>
            <p>
              This site does not use analytics or advertising cookies. The page loads its font files
              from the site itself.
            </p>

            <h2>What the Orb app stores</h2>
            <p>
              Orb stores tabs, Spaces, bookmarks, history, profiles, themes, and privacy preferences
              on your device. Boosts live in a local SQLite database. Browsing data is not sent to an
              Orb account service because there is no Orb account service.
            </p>
            <p>
              Orb downloads filter lists from EasyList, uBlock Origin, EasyPrivacy, and CookieMonster
              publishers so it can block requests. Those downloads go to the list publishers, not to
              us.
            </p>

            <h2>Removing your email</h2>
            <p>
              Open an issue at{' '}
              <a href="https://github.com/flashrod/orb/issues" target="_blank" rel="noopener noreferrer">
                github.com/flashrod/orb/issues
              </a>{' '}
              and ask us to remove your waitlist address. Include the address you used. We will
              remove it from the provider.
            </p>

            <h2>Changes</h2>
            <p>
              We will update this page when the way Orb handles data changes. The date at the top
              shows the last change.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
