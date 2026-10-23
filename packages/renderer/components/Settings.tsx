import React, { useState } from 'react';
import { ArrowCounterClockwise, Check, Code, DotsSixVertical, Rows, Shield, SidebarSimple, SlidersHorizontal, UsersThree, X } from '@phosphor-icons/react';
import { useAdBlockerStore } from '../stores/adBlocker';
import { MotionPreference, PaletteToken, useAppearanceStore } from '../stores/appearance';
import BoostsEditor from './BoostsEditor';
import { TOOLBAR_ITEMS, ToolbarItemId, useToolbarStore } from '../stores/toolbar';
import ProfilesWorkspacesSettings from './ProfilesWorkspacesSettings';
import { SEARCH_PROVIDERS } from '../lib/navigation';
import { useBrowserPreferencesStore } from '../stores/preferences';

type SettingsSection = 'appearance' | 'privacy' | 'boosts' | 'toolbar' | 'profiles';

const sections: { id: SettingsSection; title: string; note: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'appearance', title: 'Appearance', note: 'Colors and browser layout', Icon: SlidersHorizontal },
  { id: 'privacy', title: 'Privacy & Shields', note: 'Blocking and protections', Icon: Shield },
  { id: 'boosts', title: 'Boosts', note: 'Per-site customizations', Icon: Code },
  { id: 'toolbar', title: 'Toolbar', note: 'Choose and arrange controls', Icon: Rows },
  { id: 'profiles', title: 'Profiles & Workspaces', note: 'Separate browsing contexts', Icon: UsersThree },
];

const themeColors: Record<string, Record<PaletteToken, string>> = {
  paper: { canvas: '#eeece7', surface: '#f5f3ee', elevated: '#faf9f6', sidebar: '#e8e5de', border: '#d8d4ca', text: '#57534e', 'text-strong': '#292524', 'text-muted': '#8e8980', accent: '#a0522d' },
  sage: { canvas: '#e9ece6', surface: '#f0f3ed', elevated: '#f8faf5', sidebar: '#e1e7de', border: '#d0d8cd', text: '#535b50', 'text-strong': '#293229', 'text-muted': '#828c7e', accent: '#657a60' },
  night: { canvas: '#292825', surface: '#32312d', elevated: '#393833', sidebar: '#24231f', border: '#48463f', text: '#c8c3b9', 'text-strong': '#f0ede6', 'text-muted': '#9a958a', accent: '#d09a78' },
};

const paletteFields: { token: PaletteToken; label: string }[] = [
  { token: 'canvas', label: 'Canvas' }, { token: 'surface', label: 'Toolbar surfaces' },
  { token: 'elevated', label: 'Panels and menus' }, { token: 'sidebar', label: 'Sidebar' },
  { token: 'border', label: 'Borders' }, { token: 'text', label: 'Body text' },
  { token: 'text-strong', label: 'Headings' }, { token: 'text-muted', label: 'Secondary text' },
  { token: 'accent', label: 'Accent' },
];

const themes = [
  { id: 'paper', name: 'Paper', note: 'Warm and quiet', swatches: ['#eeece7', '#f5f3ee', '#a0522d'] },
  { id: 'sage', name: 'Sage', note: 'Soft green stone', swatches: ['#e9ece6', '#f0f3ed', '#657a60'] },
  { id: 'night', name: 'Night', note: 'Low light, warm ink', swatches: ['#292825', '#393833', '#d09a78'] },
] as const;

const accents = [
  { id: 'clay', label: 'Clay', color: '#a0522d' }, { id: 'moss', label: 'Moss', color: '#657a60' },
  { id: 'ocean', label: 'Ocean', color: '#597887' }, { id: 'berry', label: 'Berry', color: '#956575' },
] as const;

const motionOptions: { id: MotionPreference; label: string; detail: string }[] = [
  { id: 'off', label: 'Off', detail: 'No interface motion' },
  { id: 'gentle', label: 'Gentle', detail: 'Quiet transitions' },
  { id: 'lively', label: 'Lively', detail: 'More expressive movement' },
];

function SectionHeading({ title, detail }: { title: string; detail: string }) {
  return <div className="mb-4"><h2 className="orb-strong text-sm font-semibold">{title}</h2><p className="orb-muted mt-1 text-xs">{detail}</p></div>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-[var(--orb-accent)]' : 'bg-[var(--orb-border-strong)]'}`}>
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export default function Settings({ onClose, initialSection = 'appearance' }: { onClose: () => void; initialSection?: SettingsSection }) {
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const { enabled, toggle } = useAdBlockerStore();
  const { searchProvider, setSearchProvider } = useBrowserPreferencesStore();
  const { order, hidden, move, toggleHidden, reset } = useToolbarStore();
  const {
    theme, accent, density, tabLayout, bookmarksBarVisible, compactSideTabs, showStartPage, showTabStrip, showNavigation, compactMode, motion,
    setTheme, setAccent, setDensity, setTabLayout, setBookmarksBarVisible, setCompactSideTabs, setShowStartPage, setShowTabStrip, setShowNavigation, setCompactMode, setMotion,
    customColors, setCustomColor, resetCustomColors,
  } = useAppearanceStore();
  const selected = sections.find((item) => item.id === section) || sections[0];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/20 backdrop-blur-[3px]" onMouseDown={onClose}>
      <aside aria-label="Orb settings" aria-modal="true" role="dialog"
        className="orb-settings-enter orb-surface orb-strong orb-shadow relative flex h-full w-full max-w-[940px] flex-col border-l orb-border"
        onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex shrink-0 items-center justify-between border-b orb-border px-7 py-5">
          <div className="flex items-center gap-3">
            <div className="orb-accent-soft orb-accent flex h-9 w-9 items-center justify-center rounded-lg"><SlidersHorizontal aria-hidden="true" className="h-4 w-4" /></div>
            <div><h1 className="orb-strong text-base font-semibold tracking-tight">Settings</h1><p className="orb-muted mt-0.5 text-xs">{selected.note}</p></div>
          </div>
          <button onClick={onClose} aria-label="Close settings" className="orb-control flex h-8 w-8 items-center justify-center rounded-md"><X className="h-4 w-4" /></button>
        </header>

        <div className="flex min-h-0 flex-1">
          <nav aria-label="Settings sections" className="orb-sidebar flex w-[210px] shrink-0 flex-col gap-1 border-r orb-border px-3 py-5">
            <p className="orb-muted mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.15em]">Your browser</p>
            {sections.map(({ id, title, note, Icon }) => (
              <button key={id} onClick={() => setSection(id)} aria-current={section === id ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${section === id ? 'orb-accent-soft orb-accent' : 'orb-control'}`}>
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="min-w-0"><span className="orb-strong block truncate text-xs font-medium">{title}</span><span className="orb-muted mt-0.5 block truncate text-[10px]">{note}</span></span>
              </button>
            ))}
          </nav>

          <div className="orb-frame min-w-0 flex-1 overflow-y-auto px-7 py-6">
            {section === 'appearance' && (
              <div className="mx-auto max-w-[680px] space-y-7">
                <section>
                  <SectionHeading title="Color mood" detail="A softer palette for long days in the browser." />
                  <div className="grid grid-cols-3 gap-3">
                    {themes.map((item) => (
                      <button key={item.id} onClick={() => setTheme(item.id)} aria-pressed={theme === item.id}
                        className={`rounded-lg border p-2.5 text-left transition-colors ${theme === item.id ? 'border-[var(--orb-accent)] ring-1 ring-[var(--orb-accent)]' : 'orb-border hover:border-[var(--orb-border-strong)]'}`}>
                        <span className="mb-2 flex h-12 overflow-hidden rounded-md border orb-border"><span className="w-1/3" style={{ background: item.swatches[0] }} /><span className="w-1/3" style={{ background: item.swatches[1] }} /><span className="flex-1" style={{ background: item.swatches[2] }} /></span>
                        <span className="orb-strong block text-xs font-medium">{item.name}</span><span className="orb-muted mt-0.5 block text-[11px]">{item.note}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="grid grid-cols-[1fr_1fr] gap-8 border-t orb-border pt-6">
                  <div>
                    <SectionHeading title="Accent" detail="Choose a quiet highlight, or set every color yourself." />
                    <div className="flex items-center gap-2">
                      {accents.map((item) => <button key={item.id} aria-label={`${item.label} accent`} aria-pressed={accent === item.id}
                        onClick={() => { setAccent(item.id); setCustomColor('accent', ''); }}
                        className="flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 transition-transform hover:scale-105"
                        style={{ backgroundColor: item.color, outline: accent === item.id ? `2px solid ${item.color}` : 'none', outlineOffset: 2 }}>
                        {accent === item.id && <Check aria-hidden="true" className="h-4 w-4 text-white" />}
                      </button>)}
                    </div>
                    <details className="mt-4">
                      <summary className="orb-control flex cursor-pointer list-none items-center gap-2 rounded-md py-1 text-xs"><span>Custom palette</span><span className="orb-muted text-[10px]">9 colors</span></summary>
                      <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-3">
                        {paletteFields.map(({ token, label }) => <label key={token} className="flex min-w-0 items-center gap-2">
                          <input type="color" value={customColors[token] || themeColors[theme][token]} onChange={(event) => setCustomColor(token, event.target.value)} aria-label={`${label} color`} className="h-7 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />
                          <span className="orb-muted truncate text-[10px]">{label}</span>
                        </label>)}
                      </div>
                      <button type="button" onClick={resetCustomColors} className="orb-control mt-3 flex items-center gap-1.5 rounded px-1 py-1 text-[10px]"><ArrowCounterClockwise className="h-3 w-3" /> Reset to theme colors</button>
                    </details>
                  </div>
                  <div>
                    <SectionHeading title="Density" detail="Set the breathing room around browser controls." />
                    <div className="orb-elevated flex rounded-md border orb-border p-1">
                      {(['comfortable', 'compact'] as const).map((value) => <button key={value} onClick={() => setDensity(value)} aria-pressed={density === value}
                        className={`flex-1 rounded px-2 py-1.5 text-xs capitalize transition-colors ${density === value ? 'orb-tab-active' : 'orb-muted'}`}>{value}</button>)}
                    </div>
                  </div>
                </section>

                <section className="border-t orb-border pt-6">
                  <SectionHeading title="Tab placement" detail="Navigation and address controls stay at the top in either layout." />
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setTabLayout('top')} aria-pressed={tabLayout === 'top'} className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${tabLayout === 'top' ? 'border-[var(--orb-accent)] bg-[var(--orb-accent-soft)]' : 'orb-border orb-elevated hover:bg-[var(--orb-hover)]'}`}>
                      <Rows className="orb-accent h-5 w-5" /><span><span className="orb-strong block text-xs font-medium">Top tabs</span><span className="orb-muted mt-1 block text-[11px]">Horizontal strip</span></span>
                    </button>
                    <button onClick={() => setTabLayout('split')} aria-pressed={tabLayout === 'split'} className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${tabLayout === 'split' ? 'border-[var(--orb-accent)] bg-[var(--orb-accent-soft)]' : 'orb-border orb-elevated hover:bg-[var(--orb-hover)]'}`}>
                      <SidebarSimple className="orb-accent h-5 w-5" /><span><span className="orb-strong block text-xs font-medium">Side tabs</span><span className="orb-muted mt-1 block text-[11px]">Vertical tab rail</span></span>
                    </button>
                  </div>
                </section>

                <section className="border-t orb-border pt-6">
                  <div className="max-w-[320px]">
                    <SectionHeading title="Motion" detail="Choose how the interface responds." />
                    <div className="space-y-1">{motionOptions.map((option) => <button key={option.id} onClick={() => setMotion(option.id)} aria-pressed={motion === option.id} className={`orb-control flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left ${motion === option.id ? 'orb-accent-soft orb-accent' : 'orb-muted'}`}>
                      <span><span className="block text-xs font-medium">{option.label}</span><span className="orb-muted mt-0.5 block text-[10px]">{option.detail}</span></span>{motion === option.id && <Check aria-hidden="true" className="h-4 w-4" />}
                    </button>)}</div>
                  </div>
                </section>

                {tabLayout === 'split' && <section className="border-t orb-border pt-5">
                  <div className="orb-elevated flex items-center justify-between rounded-md border orb-border px-3 py-2.5">
                    <span><span className="orb-strong block text-xs font-medium">Compact side tabs</span><span className="orb-muted mt-1 block text-[10px]">Collapse the rail; hover its edge or press ⌘/Ctrl + Shift + E to reveal it.</span></span>
                    <Toggle checked={compactSideTabs} onChange={() => setCompactSideTabs(!compactSideTabs)} label="Compact side tabs" />
                  </div>
                </section>}

                <section className="border-t orb-border pt-5">
                  <div className="orb-elevated flex w-full items-center justify-between rounded-md border orb-border px-3 py-2.5 text-left">
                    <span><span className="orb-strong block text-xs font-medium">Show bookmarks bar</span><span className="orb-muted mt-1 block text-[10px]">Keep your saved pages and folders below the address bar.</span></span>
                    <Toggle checked={bookmarksBarVisible} onChange={() => setBookmarksBarVisible(!bookmarksBarVisible)} label="Show bookmarks bar" />
                  </div>
                </section>

                <section className="border-t orb-border pt-5">
                  <SectionHeading title="Browser chrome" detail="Hide the parts you do not need. Orb keeps a small restore control and keyboard access." />
                  <div className="space-y-2">
                    <div className="orb-elevated flex items-center justify-between rounded-md border orb-border px-3 py-2.5"><span><span className="orb-strong block text-xs font-medium">Show tab strip or side rail</span><span className="orb-muted mt-1 block text-[10px]">Turn this off to give the page more room.</span></span><Toggle checked={showTabStrip} onChange={() => setShowTabStrip(!showTabStrip)} label="Show tab strip or side rail" /></div>
                    <div className="orb-elevated flex items-center justify-between rounded-md border orb-border px-3 py-2.5"><span><span className="orb-strong block text-xs font-medium">Show navigation toolbar</span><span className="orb-muted mt-1 block text-[10px]">Includes back, forward, reload, and address/search.</span></span><Toggle checked={showNavigation} onChange={() => setShowNavigation(!showNavigation)} label="Show navigation toolbar" /></div>
                    <div className="orb-elevated flex items-center justify-between rounded-md border orb-border px-3 py-2.5"><span><span className="orb-strong block text-xs font-medium">Compact mode</span><span className="orb-muted mt-1 block text-[10px]">Hide browser chrome with ⌘/Ctrl + Shift + M. Press ⌘/Ctrl + L to restore the address toolbar.</span></span><Toggle checked={compactMode} onChange={() => setCompactMode(!compactMode)} label="Compact mode" /></div>
                  </div>
                </section>

                <section className="border-t orb-border pt-5">
                  <div className="orb-elevated rounded-md border orb-border px-3 py-3">
                    <div className="mb-3"><span className="orb-strong block text-xs font-medium">New tab page</span><span className="orb-muted mt-1 block text-[10px]">Choose what opens whenever you create a tab. Essentials is the default.</span></div>
                    <div role="radiogroup" aria-label="New tab page" className="grid grid-cols-2 gap-2">
                      <button type="button" role="radio" aria-checked={showStartPage} onClick={() => setShowStartPage(true)} className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${showStartPage ? 'orb-accent-soft orb-accent border-[var(--orb-accent)]' : 'orb-control orb-border'}`}>
                        <span className="block font-medium">Essentials</span><span className="orb-muted mt-1 block text-[10px]">Pinned sites and recent pages</span>
                      </button>
                      <button type="button" role="radio" aria-checked={!showStartPage} onClick={() => setShowStartPage(false)} className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${!showStartPage ? 'orb-accent-soft orb-accent border-[var(--orb-accent)]' : 'orb-control orb-border'}`}>
                        <span className="block font-medium">Blank page</span><span className="orb-muted mt-1 block text-[10px]">Just the page and address bar</span>
                      </button>
                    </div>
                  </div>
                </section>

                <section className="border-t orb-border pt-5">
                  <div className="flex items-center justify-between gap-6">
                    <span><span className="orb-strong block text-xs font-medium">Default search provider</span><span className="orb-muted mt-1 block text-[10px]">Used by the address bar, command bar, and Essentials page.</span></span>
                    <select aria-label="Default search provider" value={searchProvider} onChange={(event) => setSearchProvider(event.target.value as typeof searchProvider)} className="orb-strong h-9 min-w-40 rounded-md border orb-border bg-[var(--orb-elevated)] px-3 text-xs outline-none focus:border-[var(--orb-accent)]">
                      {SEARCH_PROVIDERS.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
                    </select>
                  </div>
                </section>
              </div>
            )}

            {section === 'privacy' && (
              <div className="mx-auto max-w-[680px]">
                <SectionHeading title="Shields" detail="Keep the protections you use most close at hand." />
                <div className="orb-elevated flex items-center justify-between rounded-lg border orb-border p-4">
                  <div className="flex items-center gap-3"><div className="orb-accent-soft orb-accent flex h-9 w-9 items-center justify-center rounded-md"><Shield className="h-4 w-4" /></div><div><p className="orb-strong text-xs font-medium">Ad and tracker blocking</p><p className="orb-muted mt-1 text-[11px]">{enabled ? 'Active for this browser' : 'Paused'}</p></div></div>
                  <Toggle checked={enabled} onChange={toggle} label="Toggle ad and tracker blocking" />
                </div>
                <p className="orb-muted mt-4 text-xs leading-5">More detailed controls for filter lists, blocked requests, site exceptions, and fingerprinting are being added as their runtime behavior is completed.</p>
              </div>
            )}

            {section === 'boosts' && <div className="mx-auto max-w-[720px]"><BoostsEditor /></div>}

            {section === 'profiles' && <ProfilesWorkspacesSettings />}

            {section === 'toolbar' && <div className="mx-auto max-w-[680px] space-y-5">
              <div><h2 className="orb-strong text-sm font-semibold">Toolbar controls</h2><p className="orb-muted mt-1 text-xs leading-5">Drag the grip to put controls where they work best. Hide controls you don’t need; the address field can be moved too.</p></div>
              <div className="space-y-2">{order.map((id, index) => {
                const item = TOOLBAR_ITEMS.find((entry) => entry.id === id);
                if (!item) return null;
                return <div key={id} draggable onDragStart={(event) => { event.dataTransfer.setData('text/plain', id); event.dataTransfer.effectAllowed = 'move'; }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const source = event.dataTransfer.getData('text/plain') as ToolbarItemId; if (source && source !== id) move(source, id); }} className="orb-elevated flex items-center gap-3 rounded-lg border orb-border px-3 py-2.5">
                  <span aria-hidden="true" className="orb-muted cursor-grab"><DotsSixVertical className="h-4 w-4" /></span>
                  <span className="orb-strong flex-1 text-xs">{item.label}</span>
                  <span className="orb-muted text-[10px]">{index + 1}</span>
                  <Toggle checked={!hidden.includes(id)} onChange={() => toggleHidden(id)} label={`Show ${item.label}`} />
                </div>;
              })}</div>
              <button type="button" onClick={reset} className="orb-control rounded-md border orb-border px-3 py-2 text-xs">Restore default toolbar</button>
            </div>}
          </div>
        </div>
      </aside>
    </div>
  );
}
