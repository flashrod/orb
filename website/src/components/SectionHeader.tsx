'use client';

export default function SectionHeader({
  label,
  title,
  description,
  className = '',
}: {
  label: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">
        {label}
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-lg text-muted leading-7">{description}</p>
      )}
    </div>
  );
}
