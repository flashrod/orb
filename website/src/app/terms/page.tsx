import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import Logo from '@/components/Logo';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'The terms that cover the Orb beta and website.',
};

export default function TermsPage() {
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
          <h1 className="text-4xl font-semibold tracking-tight text-ink md:text-5xl">Terms</h1>
          <p className="mt-4 text-sm text-muted">Last updated October 25, 2026</p>

          <div className="legal-copy mt-12">
            <h2>The beta</h2>
            <p>
              Orb is beta software. It may crash, lose state, or break a site. Do not use it as your
              only browser for work you cannot lose.
            </p>

            <h2>License</h2>
            <p>
              The Orb source is released under the MIT license. The license in the repository
              controls your rights to use, copy, and modify the code.
            </p>

            <h2>Your data</h2>
            <p>
              You are responsible for the data you put into Orb and for keeping backups. The project
              does not run a sync service and cannot recover data from your device.
            </p>

            <h2>Waitlist</h2>
            <p>
              Joining the waitlist does not guarantee an invite or a release date. We may close the
              beta or change its scope.
            </p>

            <h2>Acceptable use</h2>
            <p>
              Do not use Orb to break the law or to interfere with sites and services you do not
              own. The project is not responsible for how you use the software.
            </p>

            <h2>No warranty</h2>
            <p>
              Orb is provided as is, without warranty of any kind. To the extent the law allows, the
              project is not liable for damages that come from using it.
            </p>

            <h2>Contact</h2>
            <p>
              Open an issue at{' '}
              <a href="https://github.com/flashrod/orb/issues" target="_blank" rel="noopener noreferrer">
                github.com/flashrod/orb/issues
              </a>
              .
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
