import React from 'react';
import { Check, Globe, SidebarSimple, Rows, Shield, SlidersHorizontal, X, ArrowCounterClockwise } from '@phosphor-icons/react';
import { useAdBlockerStore } from '../stores/adBlocker';
import { MotionPreference, PaletteToken, useAppearanceStore } from '../stores/appearance';

const themeColors: Record<string, Record<PaletteToken, string>> = {
  paper: { canvas: '#eeece7', surface: '#f5f3ee', elevated: '#faf9f6', sidebar: '#e8e5de', border: '#d8d4ca', text: '#57534e', 'text-strong': '#292524', 'text-muted': '#8e8980', accent: '#a0522d' },
  sage: { canvas: '#e9ece6', surface: '#f0f3ed', elevated: '#f8faf5', sidebar: '#e1e7de', border: '#d0d8cd', text: '#535b50', 'text-strong': '#293229', 'text-muted': '#828c7e', accent: '#657a60' },
  night: { canvas: '#292825', surface: '#32312d', elevated: '#393833', sidebar: '#24231f', border: '#48463f', text: '#c8c3b9', 'text-strong': '#f0ede6', 'text-muted': '#9a958a', accent: '#d09a78' },
};

const paletteFields: { token: PaletteToken; label: string }[] = [
  { token: 'canvas', label: 'Canvas' },
  { token: 'surface', label: 'Toolbar surfaces' },
  { token: 'elevated', label: 'Panels and menus' },
  { token: 'sidebar', label: 'Sidebar' },
  { token: 'border', label: 'Borders' },
  { token: 'text', label: 'Body text' },
  { token: 'text-strong', label: 'Headings' },
  { token: 'text-muted', label: 'Secondary text' },
  { token: 'accent', label: 'Accent' },
];

const themes = [
  { id: 'paper', name: 'Paper', note: 'Warm and quiet', swatches: ['#eeece7', '#f5f3ee', '#a0522d'] },
  { id: 'sage', name: 'Sage', note: 'Soft green stone', swatches: ['#e9ece6', '#f0f3ed', '#657a60'] },
  { id: 'night', name: 'Night', note: 'Low light, warm ink', swatches: ['#292825', '#393833', '#d09a78'] },
] as const;

const motionOptions: { id: MotionPreference; label: string; detail: string }[] = [
  { id: 'off', label: 'Off', detail: 'No interface motion' },
  { id: 'gentle', label: 'Gentle', detail: 'Quiet transitions' },
  { id: 'lively', label: 'Lively', detail: 'More expressive movement' },
];

const accents = [
  { id: 'clay', label: 'Clay', color: '#a0522d' },
  { id: 'moss', label: 'Moss', color: '#657a60' },
  { id: 'ocean', label: 'Ocean', color: '#597887' },
  { id: 'berry', label: 'Berry', color: '#956575' },
] as const;

export default function Settings({ onClose }: { onClose: () => void }) {
  const { enabled, toggle } = useAdBlockerStore();
  const {
    theme, accent, density, tabLayout, sidebarWidth, sidebarAutoHide, motion,
    setTheme, setAccent, setDensity, setTabLayout, setSidebarWidth, setSidebarAutoHide, setMotion, customColors, setCustomColor, resetCustomColors,
  } = useAppearanceStore();

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/20 backdrop-blur-[3px]" onMouseDown={onClose}>
      <aside
        aria-label="Appearance settings"
        aria-modal="true"
        role="dialog"
        className="orb-settings-enter orb-surface orb-strong orb-shadow relative flex h-full w-full max-w-[620px] flex-col border-l orb-border"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b orb-border px-7 py-5">
          <div className="flex items-center gap-3">
            <div className="orb-accent-soft orb-accent flex h-9 w-9 items-center justify-center rounded-lg">
              <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            </div>
            <div>
              <h1 className="orb-strong text-base font-semibold tracking-tight">Make Orb yours</h1>
              <p className="orb-muted mt-0.5 text-xs">Appearance, layout, and browsing feel</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close settings" className="orb-control flex h-8 w-8 items-center justify-center rounded-md">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-7 overflow-y-auto px-7 py-6">
          <section>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="orb-strong text-sm font-semibold">Color mood</h2>
                <p className="orb-muted mt-1 text-xs">A softer palette for long days in the browser.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {themes.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTheme(item.id)}
                  aria-pressed={theme === item.id}
                  className={`rounded-lg border p-2.5 text-left transition-all ${theme === item.id ? 'border-[var(--orb-accent)] ring-1 ring-[var(--orb-accent)]' : 'orb-border hover:border-[var(--orb-border-strong)]'}`}
                >
                  <span className="mb-2 flex h-12 overflow-hidden rounded-md border orb-border">
                    <span className="w-1/3" style={{ background: item.swatches[0] }} />
                    <span className="w-1/3" style={{ background: item.swatches[1] }} />
                    <span className="flex-1" style={{ background: item.swatches[2] }} />
                  </span>
                  <span className="orb-strong block text-xs font-medium">{item.name}</span>
                  <span className="orb-muted mt-0.5 block text-[11px]">{item.note}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-[1fr_1fr] gap-8 border-t orb-border pt-6">
            <div>
              <h2 className="orb-strong text-sm font-semibold">Accent</h2>
              <p className="orb-muted mt-1 text-xs">Choose one quiet highlight.</p>
              <div className="mt-3 flex items-center gap-2">
                {accents.map((item) => (
                  <button
                    key={item.id}
                    aria-label={`${item.label} accent`}
                    aria-pressed={accent === item.id}
                    onClick={() => { setAccent(item.id); setCustomColor('accent', ''); }}
                    className="flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 transition-transform hover:scale-105"
                    style={{ backgroundColor: item.color, outline: accent === item.id ? `2px solid ${item.color}` : 'none', outlineOffset: 2 }}
                  >
                    {accent === item.id && <Check aria-hidden="true" className="h-4 w-4 text-white" />}
                  </button>
                ))}
              </div>
              <details className="mt-4">
                <summary className="orb-control flex cursor-pointer list-none items-center gap-2 rounded-md py-1 text-xs">
                  <span>Custom palette</span><span className="orb-muted text-[10px]">9 colors</span>
                </summary>
                <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-3">
                  {paletteFields.map(({ token, label }) => (
                    <label key={token} className="flex min-w-0 items-center gap-2">
                      <input type="color" value={customColors[token] || themeColors[theme][token]} onChange={(event) => setCustomColor(token, event.target.value)} aria-label={`${label} color`} className="h-7 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />
                      <span className="orb-muted truncate text-[10px]">{label}</span>
                    </label>
                  ))}
                </div>
                <button type="button" onClick={resetCustomColors} className="orb-control mt-3 flex items-center gap-1.5 rounded px-1 py-1 text-[10px]">
                  <ArrowCounterClockwise className="h-3 w-3" /> Reset to theme colors
                </button>
              </details>
            </div>
            <div>
              <h2 className="orb-strong text-sm font-semibold">Density</h2>
              <p className="orb-muted mt-1 text-xs">Set the breathing room around controls.</p>
              <div className="orb-elevated mt-3 flex rounded-md border orb-border p-1">
                {(['comfortable', 'compact'] as const).map((value) => (
                  <button key={value} onClick={() => setDensity(value)} aria-pressed={density === value}
                    className={`flex-1 rounded px-2 py-1.5 text-xs capitalize transition-colors ${density === value ? 'orb-tab-active' : 'orb-muted'}`}>
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="border-t orb-border pt-6">
            <div className="mb-3">
              <h2 className="orb-strong text-sm font-semibold">Tab placement</h2>
              <p className="orb-muted mt-1 text-xs">Keep your browser controls at the top in either layout.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setTabLayout('top')} aria-pressed={tabLayout === 'top'}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${tabLayout === 'top' ? 'border-[var(--orb-accent)] bg-[var(--orb-accent-soft)]' : 'orb-border orb-elevated hover:bg-[var(--orb-hover)]'}`}>
                <Rows className="orb-accent h-5 w-5" />
                <span><span className="orb-strong block text-xs font-medium">Top tabs</span><span className="orb-muted mt-1 block text-[11px]">Horizontal strip</span></span>
              </button>
              <button onClick={() => setTabLayout('split')} aria-pressed={tabLayout === 'split'}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${tabLayout === 'split' ? 'border-[var(--orb-accent)] bg-[var(--orb-accent-soft)]' : 'orb-border orb-elevated hover:bg-[var(--orb-hover)]'}`}>
                <SidebarSimple className="orb-accent h-5 w-5" />
                <span><span className="orb-strong block text-xs font-medium">Split tabs</span><span className="orb-muted mt-1 block text-[11px]">Side rail and page</span></span>
              </button>
            </div>
          </section>

          <section className="border-t orb-border pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="orb-strong text-sm font-semibold">Sidebar width</h2>
                <p className="orb-muted mt-1 text-xs">Give your spaces a little more room.</p>
              </div>
              <span className="orb-muted font-mono text-xs">{sidebarWidth}px</span>
            </div>
            <input type="range" min="64" max="112" step="8" value={sidebarWidth}
              onChange={(event) => setSidebarWidth(Number(event.target.value))}
              aria-label="Sidebar width" className="mt-4 w-full accent-[var(--orb-accent)]" />
          </section>

          <section className="border-t orb-border pt-6">
            <div className="mb-3">
              <h2 className="orb-strong text-sm font-semibold">Privacy</h2>
              <p className="orb-muted mt-1 text-xs">Quick control for your active browsing protections.</p>
            </div>
            <div className="orb-elevated flex items-center justify-between rounded-lg border orb-border p-3.5">
              <div className="flex items-center gap-3">
                <div className="orb-accent-soft orb-accent flex h-8 w-8 items-center justify-center rounded-md"><Shield className="h-4 w-4" /></div>
                <div><p className="orb-strong text-xs font-medium">Ad and tracker blocking</p><p className="orb-muted mt-1 text-[11px]">{enabled ? 'Active for this browser' : 'Paused'}</p></div>
              </div>
              <button onClick={toggle} aria-pressed={enabled} aria-label="Toggle ad and tracker blocking"
                className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? 'bg-[var(--orb-accent)]' : 'bg-[var(--orb-border-strong)]'}`}>
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-8 border-t orb-border pt-6">
            <div>
              <h2 className="orb-strong text-sm font-semibold">Motion</h2>
              <p className="orb-muted mt-1 text-xs">Choose how the interface responds.</p>
              <div className="mt-3 space-y-1">
                {motionOptions.map((option) => (
                  <button key={option.id} onClick={() => setMotion(option.id)} aria-pressed={motion === option.id}
                    className={`orb-control flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left ${motion === option.id ? 'orb-accent-soft orb-accent' : 'orb-muted'}`}>
                    <span><span className="block text-xs font-medium">{option.label}</span><span className="orb-muted mt-0.5 block text-[10px]">{option.detail}</span></span>
                    {motion === option.id && <Check aria-hidden="true" className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="orb-strong text-sm font-semibold">Sidebar</h2>
              <p className="orb-muted mt-1 text-xs">Keep the workspace rail close by or let it tuck away.</p>
              <button type="button" role="switch" aria-checked={sidebarAutoHide} onClick={() => setSidebarAutoHide(!sidebarAutoHide)}
                className="orb-control mt-3 flex w-full items-center justify-between rounded-md border orb-border px-3 py-2.5 text-left">
                <span><span className="orb-strong block text-xs font-medium">Auto-hide sidebar</span><span className="orb-muted mt-1 block text-[10px]">Reveal it when you move to the left edge.</span></span>
                <span className={`relative ml-3 h-5 w-9 shrink-0 rounded-full transition-colors ${sidebarAutoHide ? 'bg-[var(--orb-accent)]' : 'bg-[var(--orb-border-strong)]'}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${sidebarAutoHide ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                </span>
              </button>
            </div>
          </section>

          <section className="border-t orb-border pt-6">
            <div className="flex items-center gap-3">
              <Globe className="orb-accent h-4 w-4" />
              <div><h2 className="orb-strong text-sm font-semibold">Moving from Arc?</h2><p className="orb-muted mt-1 text-xs">Bring your bookmarks, tabs, and spaces into Orb.</p></div>
            </div>
            <button disabled className="orb-control mt-3 rounded-md border orb-border px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50">Arc import is on the roadmap</button>
          </section>
        </div>
      </aside>
    </div>
  );
}
