'use client';

import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react';
import Reveal from '@/components/Reveal';

const ICONS: Record<string, React.ElementType> = {
  spaces: SquaresFourIcon,
  command: CommandIcon,
  shield: ShieldCheckIcon,
  cursor: CursorClickIcon,
  palette: PaletteIcon,
  tabs: LayoutIcon,
  shortcuts: TerminalIcon,
};

import {
  SquaresFour as SquaresFourIcon,
  Command as CommandIcon,
  ShieldCheck as ShieldCheckIcon,
  CursorClick as CursorClickIcon,
  Palette as PaletteIcon,
  Layout as LayoutIcon,
  Terminal as TerminalIcon,
} from '@phosphor-icons/react';

interface FeatureCardProps {
  tag: string;
  title: string;
  summary: string;
  body: string;
  href: string;
  icon: string;
  span?: number;
  delay?: number;
}

export default function FeatureCard({
  tag,
  title,
  summary,
  body,
  href,
  icon,
  span = 1,
  delay = 0,
}: FeatureCardProps) {
  const Icon = ICONS[icon] || SquaresFourIcon;
  return (
    <Reveal delay={delay} className={`h-full ${span === 2 ? 'lg:col-span-2' : ''}`}>
      <Link
        href={href}
        className="block h-full flex flex-col rounded-lg border border-line bg-surface p-6 transition-colors duration-700 ease-fluid hover:border-accent/40"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-line bg-canvas text-accent">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-0.5 text-[10px] font-semibold text-accent-strong uppercase tracking-wider">
            {tag}
          </span>
        </div>
        <h3 className="mt-5 text-xl font-semibold tracking-tight text-ink">{title}</h3>
        <p className="mt-2 text-sm text-muted leading-6">{summary}</p>
        <span className="mt-auto inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-accent-strong">
          Read more
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </span>
      </Link>
    </Reveal>
  );
}
