import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  Check,
  Code,
  Globe,
  GraduationCap,
  HandWaving,
  HouseLine,
  Leaf,
  Moon,
  ShieldCheck,
  Sparkle,
  Sun,
} from '@phosphor-icons/react';
import { useAppearanceStore, type AppearanceAccent, type AppearanceTheme } from '../stores/appearance';
import { useBrowserPreferencesStore } from '../stores/preferences';
import {
  greetingName,
  isLastOnboardingStep,
  nextOnboardingStep,
  normalizeDisplayName,
  onboardingStepLabel,
  previousOnboardingStep,
} from '../../shared/onboarding';

export type OnboardingChoice = {
  displayName: string;
  spaces: { name: string; color: string }[];
};

type PurposeId = 'work' | 'study' | 'reading' | 'personal';

const PURPOSES: {
  id: PurposeId;
  name: string;
  note: string;
  color: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'work', name: 'Work', note: 'Projects, docs, and the mess that comes with them.', color: '#597887', Icon: Briefcase },
  { id: 'study', name: 'Study', note: 'Lectures, notes, and fourteen open tabs.', color: '#657a60', Icon: GraduationCap },
  { id: 'reading', name: 'Reading', note: 'Long reads, newsletters, and tabs you will get to.', color: '#b07d3e', Icon: BookOpen },
  { id: 'personal', name: 'Personal', note: 'Mail, plans, and everything else.', color: '#a0522d', Icon: HouseLine },
];

const THEMES: {
  id: AppearanceTheme;
  name: string;
  note: string;
  Icon: React.ComponentType<{ className?: string }>;
  swatches: [string, string, string];
}[] = [
  { id: 'paper', name: 'Paper', note: 'Warm daylight', Icon: Sun, swatches: ['#eeece7', '#a0522d', '#292524'] },
  { id: 'sage', name: 'Sage', note: 'Soft reading light', Icon: Leaf, swatches: ['#e9ece6', '#657a60', '#293229'] },
  { id: 'night', name: 'Night', note: 'Late, low light', Icon: Moon, swatches: ['#292825', '#d09a78', '#f0ede6'] },
];

const ACCENTS: { id: AppearanceAccent; label: string; color: string }[] = [
  { id: 'clay', label: 'Clay', color: '#a0522d' },
  { id: 'moss', label: 'Moss', color: '#657a60' },
  { id: 'ocean', label: 'Ocean', color: '#597887' },
  { id: 'berry', label: 'Berry', color: '#956575' },
];

const FALLBACK_SPACE = { name: 'Personal', color: '#a0522d' };

function OrbMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="16" cy="16" r="7" stroke="currentColor" strokeWidth="1.8" opacity="0.72" />
      <circle cx="16" cy="16" r="2.4" fill="currentColor" />
      <circle cx="27" cy="9" r="1.6" fill="currentColor" />
    </svg>
  );
}

function HelloArt() {
  const artRef = useRef<HTMLDivElement>(null);

  // A few pixels of lean toward the cursor. Small on purpose: it should feel
  // like the orb noticed you, not like the page is sliding around.
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const node = artRef.current;
    if (!node) return;
    if (document.documentElement.dataset.motion === 'off') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    node.style.setProperty('--orb-tilt-x', `${(x * 14).toFixed(2)}px`);
    node.style.setProperty('--orb-tilt-y', `${(y * 14).toFixed(2)}px`);
  };

  const resetTilt = () => {
    artRef.current?.style.setProperty('--orb-tilt-x', '0px');
    artRef.current?.style.setProperty('--orb-tilt-y', '0px');
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8">
      <div
        ref={artRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetTilt}
        className="orb-tilt relative flex h-[clamp(230px,31vw,340px)] w-[clamp(230px,31vw,340px)] items-center justify-center"
      >
        <div className="orb-float absolute inset-0 flex items-center justify-center">
          <div aria-hidden="true" className="orb-aurora">
            <span className="orb-aurora-a" />
            <span className="orb-aurora-b" />
          </div>
          <div aria-hidden="true" className="orb-ring" />
          <div aria-hidden="true" className="orb-ring" />
          <div className="orb-onboarding-halo absolute inset-0 rounded-full" />
          <svg viewBox="0 0 320 320" className="relative h-full w-full" fill="none" aria-hidden="true">
            <circle cx="160" cy="160" r="138" stroke="var(--orb-border)" strokeWidth="1" />
            <g className="orb-orbit-slow" style={{ transformOrigin: '160px 160px' }}>
              <circle cx="160" cy="160" r="118" stroke="var(--orb-border-strong)" strokeWidth="1" strokeDasharray="2 9" />
              <circle cx="160" cy="42" r="5" fill="var(--orb-accent)" />
            </g>
            <g className="orb-orbit-reverse" style={{ transformOrigin: '160px 160px' }}>
              <circle cx="160" cy="160" r="86" stroke="var(--orb-border-strong)" strokeWidth="1" opacity="0.7" />
              <circle cx="246" cy="160" r="3.5" fill="var(--orb-accent)" opacity="0.75" />
            </g>
            <circle cx="160" cy="160" r="42" fill="var(--orb-accent-soft)" />
            <circle cx="160" cy="160" r="9" fill="var(--orb-accent)" className="orb-pulse" />
            <circle cx="160" cy="160" r="42" stroke="var(--orb-accent)" strokeWidth="1" opacity="0.35" />
          </svg>
        </div>
      </div>
      <div className="orb-enter text-center" style={{ '--i': 3 } as React.CSSProperties}>
        <p className="orb-muted text-[10px]">The web, with the volume down.</p>
        <p className="orb-muted mt-1 text-[10px] opacity-70">Made for macOS · Version 0.1</p>
      </div>
    </div>
  );
}

function HelloStep({ name, onName, onContinue }: { name: string; onName: (value: string) => void; onContinue: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const first = greetingName(name);

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 260);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="min-w-0">
      <p className="orb-accent orb-enter flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ '--i': 0 } as React.CSSProperties}>
        <HandWaving className="h-3.5 w-3.5" />
        Hello
      </p>
      <h1 className="orb-serif orb-strong orb-enter-title mt-5 max-w-[13ch] text-[clamp(40px,4.6vw,60px)] font-medium leading-[1.02] tracking-[-0.04em]" style={{ '--i': 1 } as React.CSSProperties}>
        {first ? `Hi, ${first}.` : 'Hi, I’m Orb.'}
      </h1>
      <p className="orb-muted orb-enter mt-6 max-w-[42ch] text-[14px] leading-[1.75]" style={{ '--i': 2 } as React.CSSProperties}>
        {first
          ? 'Good to meet you. A calmer browser for the way you actually work. I’ll ask three small things, then stay out of your way.'
          : 'A calmer browser for the way you actually work. I’ll ask three small things, then stay out of your way.'}
      </p>

      <form
        className="orb-enter mt-8 max-w-[340px]"
        style={{ '--i': 3 } as React.CSSProperties}
        onSubmit={(event) => {
          event.preventDefault();
          onContinue();
        }}
      >
        <label htmlFor="onboarding-name" className="orb-muted mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em]">
          What should I call you?
        </label>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            id="onboarding-name"
            value={name}
            maxLength={24}
            autoComplete="given-name"
            onChange={(event) => onName(event.target.value)}
            placeholder="Your name"
            className="orb-strong w-full rounded-lg border orb-border bg-[var(--orb-elevated)] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--orb-accent)]"
          />
          <button type="submit" aria-label="Continue" className="orb-accent-bg flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white transition-transform hover:scale-[1.03] active:scale-95">
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <p className="orb-muted mt-2 text-[10px]">Optional. Just for hellos, stored on this Mac.</p>
      </form>
    </div>
  );
}

function SpaceRail({ selected }: { selected: PurposeId[] }) {
  const chosen = PURPOSES.filter((purpose) => selected.includes(purpose.id));
  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <div className="orb-elevated orb-shadow overflow-hidden rounded-xl border orb-border">
        <div className="flex h-9 items-center justify-between border-b orb-border px-3">
          <span className="orb-muted text-[9px] font-semibold uppercase tracking-[0.16em]">Spaces</span>
          <span className="orb-muted text-[10px]">⌘⇧T</span>
        </div>
        <div className="space-y-1 p-2">
          {PURPOSES.map(({ id, name, color, Icon }) => {
            const on = selected.includes(id);
            return (
              <div
                key={id}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-all duration-300 ease-out ${on ? 'translate-x-0 bg-[var(--orb-hover)] opacity-100' : '-translate-x-1 opacity-30'}`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${color}22`, color }}>
                  <Icon className="h-3 w-3" />
                </span>
                <span className={`min-w-0 flex-1 truncate text-[11px] ${on ? 'orb-strong font-medium' : 'orb-muted'}`}>{name}</span>
                {on ? (
                  <span className="flex items-center gap-1">
                    <Check className="orb-pop-in h-3 w-3" style={{ color }} />
                  </span>
                ) : (
                  <span className="orb-muted text-[11px] leading-none">+</span>
                )}
              </div>
            );
          })}
          <div className="orb-muted mt-1 flex items-center gap-2.5 rounded-md border border-dashed orb-border px-2.5 py-2 text-[11px] opacity-70">
            <span className="text-sm leading-none">+</span>
            New space
          </div>
        </div>
      </div>
      <p className="orb-muted text-center text-[10px]">
        {chosen.length === 0
          ? 'Pick one or more. I will set them up for you.'
          : `${chosen.length} ${chosen.length === 1 ? 'Space' : 'Spaces'} ready. Rename or add more any time.`}
      </p>
    </div>
  );
}

function SpaceStep({ selected, onToggle }: { selected: PurposeId[]; onToggle: (id: PurposeId) => void }) {
  return (
    <div className="orb-stagger flex h-full flex-col justify-center gap-2.5" style={{ '--orb-stagger-base': '240ms' } as React.CSSProperties}>
      {PURPOSES.map(({ id, name, note, color, Icon }) => {
        const on = selected.includes(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => onToggle(id)}
            aria-pressed={on}
            className={`group flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-200 ${on ? 'border-[var(--orb-accent)] bg-[var(--orb-accent-soft)] shadow-sm' : 'orb-elevated orb-border hover:border-[var(--orb-border-strong)]'}`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}22`, color }}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-[12px] font-medium ${on ? 'orb-strong' : 'orb-strong'}`}>{name}</span>
              <span className="orb-muted mt-0.5 block truncate text-[10px]">{note}</span>
            </span>
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${on ? 'border-transparent text-white' : 'orb-border'}`}
              style={on ? { backgroundColor: color } : undefined}
            >
              {on && <Check className="orb-pop-in h-3 w-3" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function OrbPreview() {
  return (
    <div className="orb-elevated orb-shadow overflow-hidden rounded-xl border orb-border">
      <div className="flex h-9 items-center gap-2 border-b orb-border px-3">
        <span className="orb-muted flex h-4 items-center gap-1 text-[8px]">● ● ●</span>
        <span className="orb-surface orb-muted ml-2 flex h-5 flex-1 items-center rounded-full border orb-border px-2.5 text-[9px]">orb://new-tab</span>
      </div>
      <div className="flex h-[148px]">
        <div className="orb-sidebar flex w-[48px] flex-col items-center gap-2 border-r orb-border py-3">
          <span className="orb-accent-bg h-5 w-5 rounded-md opacity-90" />
          <span className="h-4 w-4 rounded bg-[var(--orb-border)] opacity-60" />
          <span className="h-4 w-4 rounded bg-[var(--orb-border)] opacity-40" />
          <span className="mt-auto h-4 w-4 rounded bg-[var(--orb-border)] opacity-40" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="orb-serif orb-strong text-[13px] leading-none">A little room to think.</span>
            <span className="orb-accent-bg ml-auto h-1.5 w-6 rounded-full opacity-80" />
          </div>
          <div className="orb-muted mt-0.5 h-1.5 w-[54%] rounded-full bg-[var(--orb-border-strong)] opacity-60" />
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="orb-surface flex items-center gap-1.5 rounded-md border orb-border px-2 py-1.5">
                <span className={`h-3.5 w-3.5 rounded ${item === 0 ? 'orb-accent-soft' : 'bg-[var(--orb-border)]'}`} />
                <span className="orb-muted h-1 flex-1 rounded-full bg-[var(--orb-border-strong)] opacity-50" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MoodStep() {
  const { theme, accent, setTheme, setAccent } = useAppearanceStore();

  return (
    <div className="orb-stagger flex h-full flex-col justify-center gap-5">
      <OrbPreview />

      <div>
        <p className="orb-muted mb-2 text-[10px] font-semibold uppercase tracking-[0.16em]">Mood</p>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(({ id, name, note, Icon, swatches }) => {
            const selected = theme === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                aria-pressed={selected}
                className={`rounded-lg border p-2 text-left transition-colors ${selected ? 'border-[var(--orb-accent)] bg-[var(--orb-accent-soft)]' : 'orb-elevated orb-border hover:border-[var(--orb-border-strong)]'}`}
              >
                <span className="mb-2 flex h-9 overflow-hidden rounded-md border orb-border">
                  {swatches.map((swatch) => <span key={swatch} className="flex-1" style={{ backgroundColor: swatch }} />)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon className="orb-accent h-3 w-3 shrink-0" />
                  <span className="orb-strong truncate text-[11px] font-medium">{name}</span>
                  {selected && <Check className="orb-accent ml-auto h-3 w-3 shrink-0" />}
                </span>
                <span className="orb-muted mt-0.5 block truncate text-[9px]">{note}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="orb-muted text-[10px] font-semibold uppercase tracking-[0.16em]">Accent</p>
        <div className="flex items-center gap-2">
          {ACCENTS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={`${item.label} accent`}
              aria-pressed={accent === item.id}
              onClick={() => {
                setAccent(item.id);
                useAppearanceStore.getState().setCustomColor('accent', '');
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110"
              style={{ backgroundColor: item.color, outline: accent === item.id ? `2px solid ${item.color}` : 'none', outlineOffset: 2 }}
            >
              {accent === item.id && <Check className="h-3 w-3 text-white" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReadyPanel({ spaces }: { spaces: { name: string; color: string }[] }) {
  const [status, setStatus] = useState<{ isDefault: boolean; platform: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    window.orbApi?.getDefaultBrowserStatus?.()
      .then((value) => { if (!cancelled) setStatus(value); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const makeDefault = async () => {
    setBusy(true);
    setNotice('');
    try {
      const next = await window.orbApi?.setDefaultBrowser?.();
      if (next) setStatus(next);
      setNotice(next?.isDefault ? 'Orb is now your default browser.' : 'Confirm the change in the system window.');
    } catch {
      setNotice('Could not change the default browser.');
    } finally {
      setBusy(false);
    }
  };

  const shortcuts = [
    { keys: ['⌘', 'K'], label: 'Command bar' },
    { keys: ['⌘', 'T'], label: 'New tab' },
    { keys: ['⌘', '⇧', 'M'], label: 'Compact mode' },
    { keys: ['⌘', ','], label: 'Settings' },
  ];

  return (
    <div className="orb-stagger flex h-full flex-col justify-center gap-4">
      <div className="flex flex-wrap gap-1.5">
        {spaces.map((space) => (
          <span key={space.name} className="orb-elevated flex items-center gap-1.5 rounded-full border orb-border px-2.5 py-1 text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: space.color }} />
            <span className="orb-strong font-medium">{space.name}</span>
          </span>
        ))}
      </div>

      <div className="orb-elevated rounded-xl border orb-border p-2">
        {shortcuts.map(({ keys, label }, index) => (
          <div key={label} className={`flex items-center justify-between px-2.5 py-1.5 ${index > 0 ? 'border-t orb-border' : ''}`}>
            <span className="orb-muted text-[11px]">{label}</span>
            <span className="flex items-center gap-1">
              {keys.map((key) => <kbd key={key} className="orb-key orb-strong min-w-[22px] text-center text-[10px]">{key}</kbd>)}
            </span>
          </div>
        ))}
      </div>

      <div className="orb-elevated rounded-xl border orb-border p-3.5">
        <div className="flex items-start gap-2.5">
          <span className="orb-accent-soft orb-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"><Globe className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="orb-strong text-[11px] font-medium">{status?.isDefault ? 'Orb is your default browser' : 'Make Orb your default browser'}</p>
            <p className="orb-muted mt-0.5 text-[10px] leading-4">Links from Mail and Messages open here instead.</p>
          </div>
          {status?.isDefault ? (
            <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <button
              type="button"
              onClick={() => void makeDefault()}
              disabled={busy || !status}
              className="orb-accent-soft orb-accent shrink-0 rounded-md border border-[var(--orb-accent)] px-2.5 py-1.5 text-[10px] font-medium disabled:opacity-50"
            >
              {busy ? 'Asking…' : 'Set default'}
            </button>
          )}
        </div>
        {notice && <p role="status" className="orb-muted mt-2 text-[10px]">{notice}</p>}
      </div>

      <div className="orb-muted flex items-center justify-center gap-1.5 text-[10px]">
        <ShieldCheck className="orb-accent h-3.5 w-3.5" />
        No account. No sync. Nothing leaves this Mac.
      </div>
    </div>
  );
}

export default function Onboarding({ onFinish, onSkip, macTrafficLights = false }: {
  onFinish: (choice: OnboardingChoice) => void;
  onSkip: () => void;
  /** Leaves room for the macOS window buttons in the header. */
  macTrafficLights?: boolean;
}) {
  const savedName = useBrowserPreferencesStore((state) => state.displayName);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [name, setName] = useState(savedName);
  const [selected, setSelected] = useState<PurposeId[]>(['personal']);
  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const last = isLastOnboardingStep(step);

  const chosenSpaces = PURPOSES
    .filter((purpose) => selected.includes(purpose.id))
    .map((purpose) => ({ name: purpose.name, color: purpose.color }));
  const spaces = chosenSpaces.length > 0 ? chosenSpaces : [FALLBACK_SPACE];
  const displayName = normalizeDisplayName(name);
  const first = greetingName(displayName);

  const finish = () => onFinish({ displayName, spaces });

  const advance = () => {
    if (last) {
      finish();
      return;
    }
    setDirection('forward');
    setStep((current) => nextOnboardingStep(current));
  };

  const goBack = () => {
    setDirection('back');
    setStep((current) => previousOnboardingStep(current));
  };

  const togglePurpose = (id: PurposeId) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((node) => node.offsetParent !== null);
      if (nodes.length === 0) return;
      const firstNode = nodes[0];
      const finalNode = nodes[nodes.length - 1];
      if (!event.shiftKey && document.activeElement === finalNode) {
        event.preventDefault();
        firstNode.focus();
      } else if (event.shiftKey && document.activeElement === firstNode) {
        event.preventDefault();
        finalNode.focus();
      }
    };
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, []);

  useEffect(() => {
    if (step !== 0) titleRef.current?.focus();
  }, [step]);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Orb"
      className="orb-frame fixed inset-0 z-[100] flex flex-col overflow-hidden outline-none"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onSkip();
          return;
        }
        if (event.key !== 'Enter' || event.metaKey || event.ctrlKey || event.shiftKey) return;
        const target = event.target as HTMLElement | null;
        if (target?.closest('button, a, input, select, textarea')) return;
        event.preventDefault();
        advance();
      }}
    >
      <div aria-hidden="true" className="orb-onboarding-wash pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="orb-onboarding-grain pointer-events-none absolute inset-0" />

      <header className={`relative flex shrink-0 items-center justify-between py-5 pr-6 sm:pr-10 ${macTrafficLights ? 'pl-[92px]' : 'pl-6 sm:pl-10'}`}>
        <div className="flex items-center gap-2.5">
          <span className="orb-accent-soft orb-accent flex h-8 w-8 items-center justify-center rounded-lg"><OrbMark className="h-[18px] w-[18px]" /></span>
          <span className="orb-strong text-[13px] font-semibold tracking-tight">Orb</span>
        </div>
        <button type="button" onClick={onSkip} className="orb-control rounded-md px-2.5 py-1.5 text-[11px]">Skip tour</button>
      </header>

      <main className="relative flex min-h-0 flex-1 items-start overflow-y-auto px-6 pb-4 sm:px-10">
        <div className="mx-auto my-auto grid w-full max-w-[1060px] items-center gap-10 py-3 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] lg:gap-16">
          <div key={`copy-${step}`} className={`orb-onboard-copy orb-onboard-${direction}`}>
            {step === 0 && <HelloStep name={name} onName={setName} onContinue={advance} />}

            {step === 1 && (
              <div ref={titleRef} tabIndex={-1} className="min-w-0 outline-none">
                <p className="orb-accent orb-enter flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ '--i': 0 } as React.CSSProperties}>
                  <span className="inline-block h-1 w-1 rounded-full bg-[var(--orb-accent)]" />
                  Your spaces
                </p>
                <h1 className="orb-serif orb-strong orb-enter-title mt-5 max-w-[13ch] text-[clamp(38px,4.4vw,56px)] font-medium leading-[1.02] tracking-[-0.04em]" style={{ '--i': 1 } as React.CSSProperties}>
                  What’s this browser for?
                </h1>
                <p className="orb-muted orb-enter mt-6 max-w-[42ch] text-[14px] leading-[1.75]" style={{ '--i': 2 } as React.CSSProperties}>
                  Pick as many as you like. Each one becomes a Space with its own tabs, pinned sites, and quiet.
                </p>
              </div>
            )}

            {step === 2 && (
              <div ref={titleRef} tabIndex={-1} className="min-w-0 outline-none">
                <p className="orb-accent orb-enter flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ '--i': 0 } as React.CSSProperties}>
                  <span className="inline-block h-1 w-1 rounded-full bg-[var(--orb-accent)]" />
                  Mood
                </p>
                <h1 className="orb-serif orb-strong orb-enter-title mt-5 max-w-[13ch] text-[clamp(38px,4.4vw,56px)] font-medium leading-[1.02] tracking-[-0.04em]" style={{ '--i': 1 } as React.CSSProperties}>
                  Choose a mood.
                </h1>
                <p className="orb-muted orb-enter mt-6 max-w-[42ch] text-[14px] leading-[1.75]" style={{ '--i': 2 } as React.CSSProperties}>
                  Warm paper for daylight, sage for long reading, night for late work. Your choice applies everywhere, including the pages you open next.
                </p>
              </div>
            )}

            {step === 3 && (
              <div ref={titleRef} tabIndex={-1} className="min-w-0 outline-none">
                <p className="orb-accent orb-enter flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ '--i': 0 } as React.CSSProperties}>
                  <Sparkle className="h-3.5 w-3.5" />
                  Ready
                </p>
                <h1 className="orb-serif orb-strong orb-enter-title mt-5 max-w-[13ch] text-[clamp(38px,4.4vw,56px)] font-medium leading-[1.02] tracking-[-0.04em]" style={{ '--i': 1 } as React.CSSProperties}>
                  {first ? `You’re all set, ${first}.` : 'You’re all set.'}
                </h1>
                <p className="orb-muted orb-enter mt-6 max-w-[42ch] text-[14px] leading-[1.75]" style={{ '--i': 2 } as React.CSSProperties}>
                  {spaces.length === 1
                    ? 'Your Space is ready.'
                    : `Your ${spaces.length} Spaces are ready.`} Press <kbd className="orb-key orb-strong text-[10px]">⌘K</kbd> to jump anywhere. Ads and trackers are already blocked.
                </p>
              </div>
            )}

            {step === 1 && (
              <div className="mt-6">
                <SpaceStep selected={selected} onToggle={togglePurpose} />
              </div>
            )}

            {step === 0 && (
              <p className="orb-muted orb-enter mt-7 flex items-center gap-1.5 text-[10px]" style={{ '--i': 4 } as React.CSSProperties}>
                <Code className="orb-accent h-3.5 w-3.5" />
                Open source. No account. No onboarding funnel after this.
              </p>
            )}
          </div>

          <div key={`panel-${step}`} className={`orb-onboard-panel orb-onboard-panel-${direction} min-h-0`}>
            {step === 0 && <HelloArt />}
            {step === 1 && <SpaceRail selected={selected} />}
            {step === 2 && <MoodStep />}
            {step === 3 && <ReadyPanel spaces={spaces} />}
          </div>
        </div>
      </main>

      <footer className="relative mt-auto flex shrink-0 items-center justify-between gap-4 border-t orb-border px-6 py-4 sm:px-10">
        <div className="flex items-center gap-4">
          <span key={step} className="orb-fade orb-muted font-mono text-[10px] tracking-[0.08em]">{onboardingStepLabel(step)}</span>
          <div className="relative h-[2px] w-24 overflow-hidden rounded-full bg-[var(--orb-border)]" aria-hidden="true">
            <span
              className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-[var(--orb-accent)] transition-transform duration-500"
              style={{ transform: `scaleX(${(step + 1) / 4})`, transitionTimingFunction: 'var(--orb-ease-out)' }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {step > 0 && (
            <button type="button" onClick={goBack} className="orb-control flex items-center gap-1.5 rounded-md px-3 py-2 text-[11px]">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          )}
          <button
            type="button"
            onClick={advance}
            className="orb-accent-bg flex items-center gap-2 rounded-md px-4 py-2 text-[11px] font-medium text-white shadow-sm transition-transform hover:scale-[1.01] active:scale-95"
          >
            {last ? 'Open Orb' : step === 0 ? 'Nice to meet you' : 'Continue'}
            {last ? <Sparkle className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </footer>
    </div>
  );
}
