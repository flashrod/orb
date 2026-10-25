'use client';

import { Fragment, useEffect, useRef, useState } from 'react';

const tagline = 'Your attention is not inventory. Orb is built to keep it that way.';
const words = tagline.split(' ');

export default function TaglineReveal() {
  const ref = useRef<HTMLHeadingElement>(null);
  const [activeWords, setActiveWords] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => {
      setReducedMotion(media.matches);
      if (media.matches) setActiveWords(words.length);
    };

    syncPreference();
    media.addEventListener('change', syncPreference);
    return () => media.removeEventListener('change', syncPreference);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const node = ref.current;
    if (!node) return;

    let frame = 0;
    let inView = false;

    const update = () => {
      frame = 0;
      if (!inView || !node) return;

      const rect = node.getBoundingClientRect();
      const viewport = window.innerHeight;
      const start = viewport * 0.85;
      const end = viewport * 0.35;
      const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end)));
      const next = Math.round(progress * words.length);

      setActiveWords((current) => Math.max(current, next));
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) schedule();
      },
      { rootMargin: '0px 0px -20% 0px', threshold: 0 },
    );

    observer.observe(node);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    update();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  return (
    <h2
      ref={ref}
      id="tagline"
      className="max-w-[680px] text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl"
    >
      {words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          <span
            data-tagline-word
            className={`inline-block transition-colors duration-700 ease-fluid ${
              index < activeWords ? 'text-ink' : 'text-ink/55'
            }`}
          >
            {word}
          </span>
          {index < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </h2>
  );
}
