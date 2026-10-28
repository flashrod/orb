'use client';

export default function Kbd({ children }: { children: string }) {
  return (
    <kbd
      className="inline-flex items-center gap-1 border border-line bg-surface text-ink font-mono text-[10px] font-medium rounded-[4px] px-1.5 py-0.5 select-none"
    >
      {children}
    </kbd>
  );
}
