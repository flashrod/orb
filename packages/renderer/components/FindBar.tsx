import { CaretDown, CaretUp, X } from '@phosphor-icons/react';

export default function FindBar({
  query,
  result,
  onQueryChange,
  onNext,
  onPrevious,
  onClose,
}: {
  query: string;
  result: { active: number; matches: number } | null;
  onQueryChange: (query: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
}) {
  return (
    <div className="orb-surface flex h-10 shrink-0 items-center gap-1 border-b orb-border px-2">
      <input
        autoFocus
        aria-label="Find in page"
        placeholder="Find in page"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            if (event.shiftKey) onPrevious();
            else onNext();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
          }
        }}
        className="orb-control h-7 w-56 rounded-md border orb-border bg-transparent px-2 text-xs outline-none"
      />
      <span aria-live="polite" className="orb-muted min-w-[56px] text-center text-[11px]">
        {query ? (result && result.matches > 0 ? `${result.active}/${result.matches}` : 'No results') : ''}
      </span>
      <button type="button" aria-label="Previous match" title="Previous match · Shift+Enter" onClick={onPrevious} disabled={!query} className="orb-control flex h-7 w-7 items-center justify-center rounded-md disabled:opacity-35">
        <CaretUp className="h-3.5 w-3.5" />
      </button>
      <button type="button" aria-label="Next match" title="Next match · Enter" onClick={onNext} disabled={!query} className="orb-control flex h-7 w-7 items-center justify-center rounded-md disabled:opacity-35">
        <CaretDown className="h-3.5 w-3.5" />
      </button>
      <button type="button" aria-label="Close find bar" title="Close find bar · Esc" onClick={onClose} className="orb-control flex h-7 w-7 items-center justify-center rounded-md">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
