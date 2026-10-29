import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Orb, a calmer private browser for macOS',
    template: '%s · Orb',
  },
  description:
    'Orb is an open source browser for macOS with Spaces, a keyboard first command bar, and real ad and tracker blocking.',
  applicationName: 'Orb',
  authors: [{ name: 'Dylan Mascarenhas', url: 'https://github.com/flashrod' }],
  keywords: [
    'Orb browser',
    'private browser',
    'macOS browser',
    'Arc alternative',
    'browser with Spaces',
    'ad blocker',
    'tracker blocking',
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Orb',
    title: 'Orb, a calmer private browser for macOS',
    description:
      'Spaces for every context, a command bar for everything, and real ad and tracker blocking.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Orb, a calmer private browser for macOS',
    description:
      'Spaces for every context, a command bar for everything, and real ad and tracker blocking.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; if (location.hash && location.hash !== '#top') { var id = location.hash.slice(1); requestAnimationFrame(function () { document.getElementById(id)?.scrollIntoView(); }); } else { window.scrollTo(0, 0); }",
          }}
        />
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <noscript>
          <style>{`[data-reveal],[data-tagline-word]{opacity:1!important;transform:none!important;filter:none!important;color:#141310!important}`}</style>
        </noscript>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
