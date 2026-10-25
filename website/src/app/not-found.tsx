import type { Metadata } from 'next';
import Link from 'next/link';
import Logo from '@/components/Logo';

export const metadata: Metadata = {
  title: 'Page not found',
};

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
    >
      <Link
        href="/"
        aria-label="Orb home"
        className="inline-flex items-center gap-2 text-ink transition-colors duration-700 ease-fluid hover:text-accent-strong"
      >
        <Logo className="h-10 w-10" />
        <span className="text-xl font-semibold tracking-tight">Orb</span>
      </Link>

      <p className="mt-12 font-mono text-sm text-accent-strong">404</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink md:text-5xl">
        We could not find that page.
      </h1>
      <p className="mt-4 max-w-md text-base text-muted">
        The link may be old, or the page may have moved. The browser is still where you left it.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-ink px-3 py-2 text-base font-semibold text-white transition-all duration-700 ease-fluid hover:bg-accent active:scale-[0.98]"
        >
          Back to Orb
        </Link>
        <a
          href="https://github.com/flashrod/orb/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-line px-3 py-2 text-base font-semibold text-ink transition-colors duration-700 ease-fluid hover:border-accent/40 hover:text-accent-strong"
        >
          Report a link
        </a>
      </div>
    </main>
  );
}
