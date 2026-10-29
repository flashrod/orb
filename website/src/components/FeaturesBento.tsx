'use client';

import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import {
  IconLayoutGrid,
  IconLayout,
  IconShieldCheck,
  IconPalette,
  IconKeyboard,
  IconUsers,
  IconEye,
  IconBrandGithub,
} from "@tabler/icons-react";

const features = [
  {
    title: "Spaces & tabs",
    description: "Every Space holds its own tabs and pinned sites. Name it, color it, switch without reopening.",
    icon: <IconLayoutGrid className="h-4 w-4 text-neutral-500" />,
  },
  {
    title: "Split view",
    description: "Right-click any tab and open it in split view. No toolbar button — it lives in the menu.",
    icon: <IconLayout className="h-4 w-4 text-neutral-500" />,
  },
  {
    title: "Ad & tracker blocking",
    description: "EasyList, uBlock Origin, and EasyPrivacy rules. Blocked before the first page loads.",
    icon: <IconShieldCheck className="h-4 w-4 text-neutral-500" />,
  },
  {
    title: "Per-site Boosts",
    description: "Add custom CSS to any site, or use the element picker to hide elements you don't want to see.",
    icon: <IconPalette className="h-4 w-4 text-neutral-500" />,
  },
  {
    title: "Command bar (⌘K)",
    description: "Open tabs, history, Spaces, profiles, and addresses from one ranked list.",
    icon: <IconKeyboard className="h-4 w-4 text-neutral-500" />,
  },
  {
    title: "Shortcut recorder",
    description: "Record, remap, export, and import keyboard shortcuts. Conflicts are detected automatically.",
    icon: <IconUsers className="h-4 w-4 text-neutral-500" />,
  },
  {
    title: "Profiles",
    description: "Separate cookie jars for work and personal browsing. Your data stays on this Mac.",
    icon: <IconEye className="h-4 w-4 text-neutral-500" />,
  },
  {
    title: "Crash & feedback reporting",
    description: "A render error shows a real screen with a Reload button and a prefilled GitHub issue.",
    icon: <IconBrandGithub className="h-4 w-4 text-neutral-500" />,
  },
];

export default function FeaturesBento() {
  return (
    <section className="px-6 pb-24 pt-24 md:pb-32 md:pt-32">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-ink mb-4">
            Everything Orb ships.
          </h2>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            No feature grid for its own sake. These are the parts of Orb that remove friction,
            each one real and already in the build.
          </p>
        </div>
        <BentoGrid className="max-w-7xl mx-auto">
          {features.map((item, i) => (
            <BentoGridItem
              key={item.title}
              title={item.title}
              description={item.description}
              icon={item.icon}
              className={i === 2 || i === 5 ? "md:col-span-2" : ""}
            />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}
