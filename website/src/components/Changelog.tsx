'use client';

import Reveal from '@/components/Reveal';
import { changelog } from '@/lib/content';

export default function Changelog() {
  return (
    <Reveal>
      <div className="space-y-5">
        {changelog.map((entry) => (
          <div
            key={entry.date + entry.title}
            className="border-b border-line pb-5 last:border-0 last:pb-0"
          >
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="font-mono text-xs text-accent-strong">
                {entry.date}
              </span>
              <span className="font-mono text-xs text-muted">
                {entry.version}
              </span>
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-ink">
              {entry.title}
            </h3>
            <p className="mt-2 text-sm text-muted leading-6">
              {entry.body}
            </p>
          </div>
        ))}
      </div>
    </Reveal>
  );
}
