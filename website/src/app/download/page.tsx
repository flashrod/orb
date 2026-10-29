import type { Metadata } from 'next';
import Link from 'next/link';
import CopyCommand from '@/components/CopyCommand';
import Logo from '@/components/Logo';
import { release } from '@/lib/release';

export const metadata: Metadata = {
  title: 'Download Orb for macOS',
  description:
    `Download Orb ${release.version}, the first alpha build for Apple Silicon Macs. Unsigned, free, and open source.`,
  alternates: { canonical: '/download' },
};

const included = [
  'Spaces with their own tabs, pinned sites, and quiet',
  'Split view from the tab right-click menu',
  'Ad and tracker blocking, on before the first page loads',
  'Per-site Boosts with an element picker',
  'A command bar on ⌘K, and a shortcut recorder with conflict checks',
  'Profiles that keep work and personal cookies apart',
];

const limitations = [
  'Apple Silicon only. There is no Intel or Windows build yet.',
  'Not signed or notarized, so the first launch needs one extra step.',
  'No automatic updates. A new build means downloading it again.',
  'No sync and no account. Your data stays on this Mac.',
];

const steps = [
  'Open the DMG and drag Orb into Applications.',
  'Open Orb once. macOS will refuse it the first time.',
  'Allow it in System Settings → Privacy & Security → Open Anyway, or run the command below.',
];

export default function DownloadPage() {
  return (
    <main id="main-content" className="px-6 pb-24 pt-10">
      <div className="mx-auto max-w-5xl">
        <nav aria-label="Breadcrumb" className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full px-2 py-2 text-ink transition-colors duration-700 ease-fluid hover:text-accent-strong"
          >
            <Logo className="h-5 w-5" />
            <span className="text-base font-semibold tracking-tight">Orb</span>
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link
              href="/features"
              className="text-muted transition-colors duration-700 ease-fluid hover:text-accent-strong"
            >
              Features
            </Link>
            <a
              href={release.allReleases}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted transition-colors duration-700 ease-fluid hover:text-accent-strong"
            >
              Releases
            </a>
          </div>
        </nav>

        <section aria-labelledby="download-heading" className="mt-20 md:mt-28">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">
            {release.channel} · {release.version}
          </p>
          <h1
            id="download-heading"
            className="mt-4 max-w-[18ch] text-5xl font-semibold tracking-tight text-ink md:text-6xl"
          >
            Download Orb.
          </h1>
          <p className="mt-6 max-w-[58ch] text-lg leading-7 text-muted">
            The first build anyone outside this machine has run. It does the things below already.
            Some of it is rough, and that is what this alpha is for.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a
              href={release.dmg}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-all duration-700 ease-fluid hover:bg-accent active:scale-[0.98]"
            >
              Download for Apple Silicon
              <span aria-hidden="true">↓</span>
            </a>
            <a
              href={release.page}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-medium text-ink transition-colors duration-700 ease-fluid hover:border-accent hover:text-accent-strong"
            >
              Release notes
            </a>
          </div>

          <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-xs text-muted">
            <div className="flex gap-2">
              <dt className="font-medium text-ink">Requires</dt>
              <dd>{release.minimumMacOS}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-ink">Chip</dt>
              <dd>{release.architecture}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-ink">Price</dt>
              <dd>Free, MIT licensed</dd>
            </div>
          </dl>
        </section>

        <section
          aria-labelledby="first-launch-heading"
          className="mt-20 rounded-2xl border border-line bg-surface p-6 md:p-10"
        >
          <h2 id="first-launch-heading" className="text-2xl font-semibold tracking-tight text-ink">
            First launch takes one extra step.
          </h2>
          <p className="mt-3 max-w-[62ch] text-base leading-7 text-muted">
            Orb is not signed or notarized yet — there is no Apple Developer account behind it. macOS
            blocks unsigned apps, so you have to say yes once.
          </p>
          <ol className="mt-6 space-y-3">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-base text-muted">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong"
                >
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <CopyCommand command="xattr -dr com.apple.quarantine /Applications/Orb.app" />
          <p className="mt-4 text-xs leading-6 text-muted">
            You will need to do this again each time you replace the app with a newer build.
          </p>
        </section>

        <div className="mt-20 grid gap-12 md:grid-cols-2 md:gap-16">
          <section aria-labelledby="included-heading">
            <h2 id="included-heading" className="text-2xl font-semibold tracking-tight text-ink">
              What is in this build
            </h2>
            <ul className="mt-5 space-y-3">
              {included.map((item) => (
                <li key={item} className="flex gap-3 text-base text-muted">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="limitations-heading">
            <h2 id="limitations-heading" className="text-2xl font-semibold tracking-tight text-ink">
              What it does not do yet
            </h2>
            <ul className="mt-5 space-y-3">
              {limitations.map((item) => (
                <li key={item} className="flex gap-3 text-base text-muted">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-line" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section
          aria-labelledby="feedback-heading"
          className="mt-20 border-t border-line pt-10"
        >
          <h2 id="feedback-heading" className="text-2xl font-semibold tracking-tight text-ink">
            When something breaks
          </h2>
          <p className="mt-3 max-w-[62ch] text-base leading-7 text-muted">
            It will. Send the report from inside Orb — <span className="text-ink">Help ▸ Send feedback</span> or{' '}
            <span className="text-ink">Settings ▸ About</span> — and your versions are filled in for
            you. A crash screen has its own report button. You can also{' '}
            <a
              href={release.issues}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-strong underline decoration-line underline-offset-4 transition-colors duration-700 ease-fluid hover:decoration-accent"
            >
              read the open issues
            </a>
            .
          </p>
          <p className="mt-6 text-xs text-muted">
            Orb keeps everything in{' '}
            <code className="font-mono">~/Library/Application Support/Orb</code>. Replacing the app
            keeps your tabs, history, and settings.
          </p>
        </section>

        <footer className="mt-16 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-6 text-xs text-muted">
          <Link href="/" className="transition-colors duration-700 ease-fluid hover:text-accent-strong">
            Overview
          </Link>
          <Link href="/privacy" className="transition-colors duration-700 ease-fluid hover:text-accent-strong">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors duration-700 ease-fluid hover:text-accent-strong">
            Terms
          </Link>
          <a
            href="https://github.com/flashrod/orb"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors duration-700 ease-fluid hover:text-accent-strong"
          >
            GitHub
          </a>
          <span className="ml-auto">Open source under MIT.</span>
        </footer>
      </div>
    </main>
  );
}
