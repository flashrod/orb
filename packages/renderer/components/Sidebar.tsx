import React, { useState } from 'react';
import { useSpaceStore } from '../stores/spaces';
import { useTabStore } from '../stores/tabs';
import { Plus, SquaresFour, Globe, Shield, SlidersHorizontal } from '@phosphor-icons/react';

const SPACE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  globe: Globe,
  dashboard: SquaresFour,
  shield: Shield,
  plus: Plus,
};

function getSpaceIcon(iconName: string) {
  const Icon = SPACE_ICONS[iconName] || Globe;
  return <Icon className="h-[18px] w-[18px]" />;
}

export default function Sidebar({
  spaces,
  activeSpaceId,
  setActiveSpace,
  width,
  autoHide,
  onOpenSettings,
}: {
  spaces: { id: string; name: string; icon: string; color: string }[];
  activeSpaceId: string | null;
  setActiveSpace: (id: string | null) => void;
  width: number;
  autoHide: boolean;
  onOpenSettings: () => void;
}) {
  const [hovering, setHovering] = useState(false);
  const { addSpace } = useSpaceStore();
  const { tabs } = useTabStore();
  const hidden = autoHide && !hovering;
  const effectiveWidth = hidden ? 12 : width;
  const expanded = width >= 96 && !hidden;

  const handleNewSpace = () => {
    addSpace({ name: 'New Space', icon: 'globe', color: '#a0522d', tabIds: [] });
  };

  const spaceTabCount = (spaceId: string) =>
    tabs.filter((tab) => tab.spaceId === spaceId).length;

  return (
    <aside style={{ width: effectiveWidth }} onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)} className="orb-sidebar relative z-20 flex h-full shrink-0 flex-col overflow-hidden border-r orb-border">
      <div className={`flex h-full flex-col justify-between px-3 py-4 transition-opacity duration-150 ${hidden ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
        <div className="flex flex-col gap-6">
          <div className="flex h-9 items-center px-1">
            {expanded && <span className="orb-strong text-sm font-semibold tracking-tight">Orb</span>}
          </div>

          <div className="flex w-full flex-col gap-1.5">
            {expanded && <p className="orb-muted px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em]">Spaces</p>}
            {spaces.map((space) => (
              <button
                key={space.id}
                onClick={() => setActiveSpace(space.id)}
                aria-pressed={activeSpaceId === space.id}
                className={`orb-space-row flex min-h-10 w-full items-center gap-3 rounded-lg px-2.5 transition-all duration-150 ${activeSpaceId === space.id ? 'orb-accent-soft orb-accent' : 'orb-control'}`}
                title={space.name}
              >
                <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                  {getSpaceIcon(space.icon)}
                  {spaceTabCount(space.id) > 0 && (
                    <span className="orb-accent-bg absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[9px] font-semibold text-white">
                      {Math.min(spaceTabCount(space.id), 9)}
                    </span>
                  )}
                </span>
                {expanded && <span className="min-w-0 flex-1 truncate text-left text-xs font-medium">{space.name}</span>}
              </button>
            ))}
            <button
              onClick={handleNewSpace}
              className={`orb-space-row orb-control flex min-h-10 w-full items-center gap-3 rounded-lg border border-dashed orb-border px-2.5 transition-colors ${expanded ? '' : 'justify-center'}`}
              title="New Space"
            >
              <Plus className="h-4 w-4 shrink-0" />
              {expanded && <span className="text-left text-xs">New space</span>}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1 border-t orb-border pt-3">
          <button
            onClick={onOpenSettings}
            className={`orb-control flex h-10 items-center gap-3 rounded-lg px-2.5 ${expanded ? '' : 'justify-center'}`}
            title="Privacy and Boosts"
          >
            <Shield className="h-4 w-4 shrink-0" />
            {expanded && <span className="text-left text-xs">Privacy & Boosts</span>}
          </button>
          <button
            onClick={onOpenSettings}
            className={`orb-control flex h-10 items-center gap-3 rounded-lg px-2.5 ${expanded ? '' : 'justify-center'}`}
            title="Appearance settings"
            aria-label="Open appearance settings"
          >
            <SlidersHorizontal className="h-4 w-4 shrink-0" />
            {expanded && <span className="text-left text-xs">Appearance</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
