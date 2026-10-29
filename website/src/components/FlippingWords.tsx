'use client';

import { useEffect, useRef, useState } from 'react';

const WORDS = ['Ultimate', 'Fast', 'Secure', 'Private', 'Calm'];

/**
 * Cross-fades through a list of words in a fixed-size inline box.
 * Prevents layout shift by measuring the tallest word once and locking the
 * container height. Animates opacity only — no layout-triggering properties.
 * Honors prefers-reduced-motion by showing the first word statically.
 */
export default function FlippingWords() {
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [boxHeight, setBoxHeight] = useState<number | null>(null);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const measure = () => {
      const node = containerRef.current;
      if (node) {
        const { height } = node.getBoundingClientRect();
        if (height > 0) setBoxHeight(height);
      }
    };

    // Measure after paint so fonts have loaded.
    requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % WORDS.length);
    }, 2400);
    return () => clearInterval(timer);
  }, [reducedMotion]);

  const showFlipping = !reducedMotion && boxHeight !== null;

  return (
    <span
      ref={containerRef}
      className="relative inline-block"
      style={{ height: showFlipping ? boxHeight : undefined }}
    >
      {showFlipping
        ? WORDS.map((word, i) => (
            <span
              key={word}
              className="absolute left-0 top-0 opacity-0 transition-opacity duration-500 ease-fluid"
              style={{ opacity: i === index ? 1 : 0 }}
            >
              {word}
            </span>
          ))
        : WORDS[0]}
    </span>
  );
}
