'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const LogoMark = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="2" />
    <path d="M14 8a6 6 0 1 0 0 12a6 6 0 0 0 0-12Z" stroke="currentColor" strokeWidth="2" />
    <path d="M14 14a2 2 0 1 0 0 4a2 2 0 0 0 0-4Z" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.26-1.01L12 2z" />
    </svg>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetch('https://api.github.com/repos/flashrod/orb')
      .then((res) => res.json())
      .then((data) => setStars(data.stargazers_count ?? null))
      .catch(() => setStars(null));
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 ${
        scrolled
          ? 'border-b border-orb-border bg-orb-canvas/80 backdrop-blur-md'
          : 'bg-transparent'
      } transition-all duration-300`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark />
            <span className="font-serif font-semibold text-orb-text-strong text-sm tracking-tight">
              Orb
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8 ml-12">
            <Link
              href="#features"
              className="text-xs font-medium text-orb-text-muted uppercase tracking-widest hover:text-orb-accent transition-colors"
            >
              Features
            </Link>
            <Link
              href="#privacy"
              className="text-xs font-medium text-orb-text-muted uppercase tracking-widest hover:text-orb-accent transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/docs"
              className="text-xs font-medium text-orb-text-muted uppercase tracking-widest hover:text-orb-accent transition-colors"
            >
              Docs
            </Link>
            <Link
              href="https://github.com/flashrod/orb/issues/new/choose"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-orb-text-muted uppercase tracking-widest hover:text-orb-accent transition-colors"
            >
              File a bug
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="https://github.com/flashrod/orb"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-orb-border text-orb-text-strong text-xs font-medium hover:bg-orb-hover transition-colors"
            >
              <StarIcon />
              {stars !== null ? stars.toLocaleString() : 'Star'}
            </Link>
            <Link href="#waitlist" className="btn-primary">
              Download
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
