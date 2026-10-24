'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const LogoMark = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="12" stroke="#0F0F0F" strokeWidth="2" />
    <path d="M14 8a6 6 0 1 0 0 12a6 6 0 0 0 0-12Z" stroke="#0F0F0F" strokeWidth="2" />
    <path d="M14 14a2.5 2.5 0 1 0 0 4a2.5 2.5 0 0 0 0-4Z" stroke="#0F0F0F" strokeWidth="1.5" />
  </svg>
);

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F0F0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.26-1.01L12 2z" />
    </svg>
  );
}

export default function Navbar() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch('https://api.github.com/repos/flashrod/orb')
      .then((res) => res.json())
      .then((data) => setStars(data.stargazers_count ?? null))
      .catch(() => setStars(null));
  }, []);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 bg-[#F0EEE6]/90 backdrop-blur-md border-b border-[#CFC7BA]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark />
            <span className="font-serif font-bold text-[#0F0F0F] text-xl tracking-tight">
              Orb
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="https://github.com/flashrod/orb"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-3 rounded-lg border border-[#CFC7BA] text-[#0F0F0F] text-xs font-medium hover:bg-[#F0EEE6] transition-colors"
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
