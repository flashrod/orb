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
      <body className="overflow-x-hidden w-full max-w-full">{children}</body>
    </html>
  );
}
