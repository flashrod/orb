'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Logo from '@/components/Logo';
import { navLinks } from '@/lib/content';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('top');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = navLinks
      .map((link) => document.getElementById(link.id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));

        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;

    const trigger = document.activeElement as HTMLElement | null;
    const menu = menuRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const getFocusable = () =>
      menu
        ? Array.from(
            menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
          ).filter((element) => element.tabIndex !== -1)
        : [];

    const focusables = getFocusable();
    focusables[0]?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;

      const items = getFocusable();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      trigger?.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };

    closeOnDesktop();
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  const closeMenu = () => {
    document.body.style.overflow = '';
    setOpen(false);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-6">
      <nav
        aria-label="Primary"
        className="relative z-50 mx-auto mt-6 flex w-max max-w-full items-center gap-2 rounded-full border border-line bg-canvas/85 p-2 shadow-sm backdrop-blur-xl"
      >
        <Link
          href="/"
          aria-label="Orb home"
          className="flex items-center gap-2 rounded-full px-4 py-2 text-ink transition-colors duration-700 ease-fluid hover:text-accent-strong"
        >
          <Logo className="h-5 w-5" />
          <span className="text-base font-semibold tracking-tight">Orb</span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          {navLinks.map((link) => {
            const current = active === link.id;
            return (
              <a
                key={link.id}
                href={`#${link.id}`}
                aria-current={current ? 'location' : undefined}
                className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors duration-700 ease-fluid hover:text-ink ${
                  current ? 'text-ink' : 'text-muted'
                }`}
              >
                {link.label}
                {current ? (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-accent"
                  />
                ) : null}
              </a>
            );
          })}
        </div>

        <Link
          href="#waitlist"
          className="hidden rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-all duration-700 ease-fluid hover:bg-accent active:scale-[0.98] md:inline-flex"
        >
          Join the beta
        </Link>

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((value) => !value)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors duration-700 ease-fluid hover:bg-accent-soft active:scale-[0.98] md:hidden"
        >
          <span className="relative block h-4 w-5" aria-hidden="true">
            <span
              className={`absolute left-0 h-0.5 w-5 rounded-full bg-current transition-all duration-700 ease-fluid ${
                open ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-1'
              }`}
            />
            <span
              className={`absolute left-0 h-0.5 w-5 rounded-full bg-current transition-all duration-700 ease-fluid ${
                open ? 'bottom-1/2 translate-y-1/2 -rotate-45' : 'bottom-1'
              }`}
            />
          </span>
        </button>
      </nav>

      <div
        id="mobile-menu"
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Sections"
        aria-hidden={!open}
        className={`fixed inset-0 z-40 bg-canvas/80 backdrop-blur-3xl transition-opacity duration-700 ease-fluid md:hidden ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="flex h-full flex-col justify-center px-6 pt-24">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">
            Sections
          </p>
          <div className="mt-6 flex flex-col items-start gap-2">
            {navLinks.map((link, index) => {
              const current = active === link.id;
              return (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  tabIndex={open ? 0 : -1}
                  aria-current={current ? 'location' : undefined}
                  onClick={closeMenu}
                  style={{ transitionDelay: open ? `${100 + index * 50}ms` : '0ms' }}
                  className={`text-4xl font-semibold tracking-tight transition-all duration-700 ease-fluid ${
                    open ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
                  } ${current ? 'text-accent-strong' : 'text-ink'}`}
                >
                  {link.label}
                </a>
              );
            })}
            <Link
              href="#waitlist"
              tabIndex={open ? 0 : -1}
              onClick={closeMenu}
              style={{ transitionDelay: open ? '350ms' : '0ms' }}
              className={`mt-4 rounded-full bg-ink px-3 py-2 text-base font-semibold text-white transition-all duration-700 ease-fluid ${
                open ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
              }`}
            >
              Join the beta
            </Link>
          </div>

          <div
            style={{ transitionDelay: open ? '400ms' : '0ms' }}
            className={`mt-12 border-t border-line pt-6 transition-all duration-700 ease-fluid ${
              open ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
            }`}
          >
            <p className="text-sm text-muted">Open source under MIT. Built in the open.</p>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <a
                href="https://github.com/flashrod/orb"
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={open ? 0 : -1}
                className="w-fit text-ink transition-colors duration-700 ease-fluid hover:text-accent-strong"
              >
                GitHub
              </a>
              <a
                href="https://github.com/flashrod/orb/blob/main/ROADMAP.md"
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={open ? 0 : -1}
                className="w-fit text-ink transition-colors duration-700 ease-fluid hover:text-accent-strong"
              >
                Roadmap
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
