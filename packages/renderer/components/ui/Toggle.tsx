import React from 'react';

/**
 * Shared switch. The track stays visible in the off state (surface + border)
 * so a row of toggles reads as controls instead of empty space.
 */
export default function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orb-accent)]/40 disabled:cursor-not-allowed disabled:opacity-40 ${
        checked
          ? 'border-transparent bg-[var(--orb-accent)]'
          : 'border-[var(--orb-border-strong)] bg-[var(--orb-surface)]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.28)] transition-transform duration-150 ${
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  );
}
