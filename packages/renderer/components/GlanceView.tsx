import React from 'react';
import { ArrowSquareOut, X } from '@phosphor-icons/react';
import { profilePartition } from '../lib/profiles';
import { normalizeGlanceUrl } from '../lib/glance';

export default function GlanceView({ url, profileId, onClose, onOpen }: {
  url: string;
  profileId: string;
  onClose: () => void;
  onOpen: (url: string) => void;
}) {
  const safeUrl = normalizeGlanceUrl(url);
  if (!safeUrl) return null;
  return <section aria-label="Glance link preview" className="orb-surface orb-shadow absolute bottom-4 right-4 z-40 flex h-[min(72vh,680px)] w-[min(620px,58vw)] min-w-[360px] flex-col overflow-hidden rounded-xl border orb-border">
    <header className="orb-elevated flex h-11 shrink-0 items-center gap-2 border-b orb-border px-3">
      <span className="orb-strong min-w-0 flex-1 truncate text-[11px]" title={safeUrl}>{safeUrl}</span>
      <button type="button" onClick={() => onOpen(safeUrl)} aria-label="Open this page in the current tab" title="Open in current tab" className="orb-control flex h-7 items-center gap-1 rounded-md px-2 text-[10px]"><ArrowSquareOut className="h-3.5 w-3.5" />Open</button>
      <button type="button" onClick={onClose} aria-label="Close Glance preview" title="Close preview" className="orb-control flex h-7 w-7 items-center justify-center rounded-md"><X className="h-3.5 w-3.5" /></button>
    </header>
    <webview aria-label="Glance page" className="min-h-0 flex-1" src={safeUrl} partition={profilePartition(profileId)} />
  </section>;
}
