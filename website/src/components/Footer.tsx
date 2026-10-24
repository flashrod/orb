'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-[#CFC7BA] bg-white py-16 px-6">
      <div className="container-max flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="14" cy="14" r="12" stroke="#0F0F0F" strokeWidth="2" />
            <path d="M14 8a6 6 0 1 0 0 12a6 6 0 0 0 0-12Z" stroke="#0F0F0F" strokeWidth="2" />
            <path d="M14 14a2.5 2.5 0 1 0 0 4a2.5 2.5 0 0 0 0-4Z" stroke="#0F0F0F" strokeWidth="1.5" />
          </svg>
          <span className="font-serif font-semibold text-[#0F0F0F] text-xs tracking-tight">
            Orb
          </span>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-6 text-[10px] text-[#6E6B65] uppercase tracking-widest">
          <div className="flex items-center gap-12">
            <Link
              href="https://github.com/flashrod/orb"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#A0522D] transition-colors"
            >
              GitHub
            </Link>
            <Link
              href="https://github.com/flashrod/orb/blob/main/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#A0522D] transition-colors"
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
              className="hover:text-[#A0522D] transition-colors"
            >
              Dylan Mascarenhas
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
