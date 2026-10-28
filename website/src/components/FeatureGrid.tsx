'use client';

import Reveal from '@/components/Reveal';
import FeatureCard from '@/components/FeatureCard';
import { features } from '@/lib/content';

export default function FeatureGrid() {
  return (
    <Reveal className="mx-auto max-w-6xl">
      <div className="mt-14 grid gap-4 md:grid-cols-4 lg:grid-cols-6">
        {features.map((feature, index) => (
          <FeatureCard
            key={feature.id}
            delay={index * 40}
            span={
              feature.id === 'command-bar' || feature.id === 'privacy' ? 2 : 1
            }
            {...feature}
          />
        ))}
      </div>
    </Reveal>
  );
}
