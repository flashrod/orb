'use client';

import * as React from 'react';

interface CarouselProps {
  children: React.ReactNode;
}

const CarouselContext = React.createContext<{
  currentIndex: number;
  total: number;
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
} | null>(null);

function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18l6-6-6-6" />
    </svg>
  );
}

export function Carousel({ children }: CarouselProps) {
  const items = React.Children.toArray(children) as React.ReactElement[];
  const slideCount = items.length;
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const goTo = (index: number) => {
    setCurrentIndex(((index % slideCount) + slideCount) % slideCount);
  };

  const next = () => goTo(currentIndex + 1);
  const prev = () => goTo(currentIndex - 1);

  return (
    <CarouselContext.Provider value={{ currentIndex, total: slideCount, goTo, next, prev }}>
      <div className="relative group">
        <div className="relative overflow-hidden h-[240px] rounded-lg border border-orb-border bg-orb-surface">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {items}
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <div className="flex -space-x-2">
            <button
              onClick={prev}
              disabled={currentIndex === 0}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-orb-border bg-orb-surface text-orb-text hover:bg-orb-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous slide"
            >
              <ChevronLeftIcon />
            </button>
            <button
              onClick={next}
              disabled={currentIndex === slideCount - 1}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-orb-border bg-orb-surface text-orb-text hover:bg-orb-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next slide"
            >
              <ChevronRightIcon />
            </button>
          </div>
          <div className="flex space-x-1">
            {Array.from({ length: slideCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === currentIndex ? 'bg-orb-text-strong' : 'bg-orb-border hover:bg-orb-text-muted'
                }`}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === currentIndex ? 'true' : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </CarouselContext.Provider>
  );
}

export function CarouselSlide({ children }: { children: React.ReactNode }) {
  return <div className="flex shrink-0 w-full">{children}</div>;
}
