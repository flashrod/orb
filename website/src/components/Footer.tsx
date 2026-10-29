import Link from 'next/link';
import Logo from '@/components/Logo';

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Overview', href: '#top' },
      { label: 'Download', href: '/download' },
      { label: 'What you get', href: '#product' },
      { label: 'Features', href: '/features' },
      { label: 'Shortcuts', href: '/shortcuts' },
      { label: 'Privacy', href: '#privacy' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Project',
    links: [
      { label: 'GitHub', href: 'https://github.com/flashrod/orb' },
      { label: 'Roadmap', href: 'https://github.com/flashrod/orb/blob/main/ROADMAP.md' },
      { label: 'Issues', href: 'https://github.com/flashrod/orb/issues' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy policy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link
              href="/"
              aria-label="Orb home"
              className="inline-flex items-center gap-2 text-ink transition-colors duration-700 ease-fluid hover:text-accent-strong"
            >
              <Logo className="h-6 w-6" />
              <span className="text-base font-semibold tracking-tight">Orb</span>
            </Link>
            <p className="mt-3 text-sm text-muted">
              A calmer, private browser for macOS. Built in the open.
            </p>
            <p className="mt-3 text-xs text-muted">Open source under MIT.</p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  {column.title}
                </p>
                <ul className="mt-3 space-y-2">
                  {column.links.map((link) => {
                    const external = link.href.startsWith('http');
                    return (
                      <li key={link.label}>
                        {external ? (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-ink transition-colors duration-700 ease-fluid hover:text-accent-strong"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <Link
                            href={link.href}
                            className="text-sm text-ink transition-colors duration-700 ease-fluid hover:text-accent-strong"
                          >
                            {link.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Orb. MIT licensed.</p>
          <p>
            Made by{' '}
            <a
              href="https://github.com/flashrod"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink transition-colors duration-700 ease-fluid hover:text-accent-strong"
            >
              Dylan Mascarenhas
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
