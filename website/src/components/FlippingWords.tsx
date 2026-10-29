'use client';

import { useEffect, useRef, useState } from 'react';

const WORDS = ['Ultimate', 'Fast', 'Secure', 'Private', 'Calm'];

function measureText(text: string, font: string): { width: number; height: number } {
  const s = document.createElement('span');
  s.textContent = text;
  s.style.position = 'absolute';
  s.style.visibility = 'hidden';
  s.style.whiteSpace = 'nowrap';
  s.style.font = font;
  document.body.appendChild(s);
  const rect = s.getBoundingClientRect();
  const size = { width: rect.width, height: rect.height };
  s.remove();
  return size;
}

export default function FlippingWords() {
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
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
    const node = containerRef.current;
    if (!node) return;
    const font = getComputedStyle(node).font;
    const sizes = WORDS.map((word) => measureText(word, font));
    const width = Math.max(...sizes.map((s) => s.width));
    const height = Math.max(...sizes.map((s) => s.height));
    setSize({ width, height });
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion || size === null) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % WORDS.length);
    }, 2400);
    return () => clearInterval(timer);
  }, [reducedMotion, size]);

  const showFlipping = !reducedMotion && size !== null;

  return (
    <span
      ref={containerRef}
      className="inline-block"
      style={{
        width: showFlipping ? `${size.width}px` : undefined,
        height: showFlipping ? `${size.height}px` : undefined,
      }}
    >
      {showFlipping
        ? WORDS.map((word, i) => (
            <span
              key={word}
              className="absolute inset-0 flex items-center justify-center w-full h-full opacity-0 transition-opacity duration-500 ease-fluid"
              style={{ opacity: i === index ? 1 : 0 }}
            >
              {word}
            </span>
          ))
        : WORDS[0]}
    </span>
  );
}
