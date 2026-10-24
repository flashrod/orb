import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Orb — A calm, private browser',
  description:
    'Orb is an Arc-inspired browser for focus and privacy. Spaces, Boosts, real ad + tracker blocking, and a warm monochrome UI you can restyle completely.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <script
          src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"
          defer
        />
        <script
          src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"
          defer
        />
      </head>
      <body className="overflow-x-hidden w-full max-w-full">{children}</body>
    </html>
  );
}
