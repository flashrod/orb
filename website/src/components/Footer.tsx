'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-orb-border bg-orb-surface py-16 px-6">
      <div className="container-max flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-orb-accent flex items-center justify-center text-white text-[10px] font-serif font-bold">
            O
          </div>
          <span className="font-serif font-semibold text-orb-text-strong text-xs tracking-tight">
            Orb
          </span>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-6 text-[10px] text-orb-text-muted uppercase tracking-widest">
          <div className="flex items-center gap-12">
            <Link
              href="https://github.com/flashrod/orb"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-orb-accent transition-colors"
            >
              GitHub
            </Link>
            <Link
              href="https://github.com/flashrod/orb/blob/main/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-orb-accent transition-colors"
            >
              README
            </Link>
          </div>
          <p className="whitespace-nowrap">
            Developed by{' '}
            <a
              href="https://github.com/flashrod"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-orb-accent transition-colors"
            >
              Dylan Mascarenhas
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
