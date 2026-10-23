import React from 'react';
import { useSpaceStore } from '../stores/spaces';
import { useTabStore } from '../stores/tabs';
import { Plus, LayoutDashboard, Globe, Shield, Bot } from 'lucide-react';

const SPACE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  globe: Globe,
  dashboard: LayoutDashboard,
  shield: Shield,
  bot: Bot,
  plus: Plus,
};

function getSpaceIcon(iconName: string) {
  const Icon = SPACE_ICONS[iconName] || Globe;
  return <Icon className="w-5 h-5" />;
}

export default function Sidebar({
  spaces,
  activeSpaceId,
  setActiveSpace,
}: {
  spaces: { id: string; name: string; icon: string; color: string }[];
  activeSpaceId: string | null;
  setActiveSpace: (id: string | null) => void;
}) {
  const { addSpace, removeSpace } = useSpaceStore();
  const { tabs } = useTabStore();

  const handleNewSpace = () => {
    addSpace({ name: 'New Space', icon: 'globe', color: '#3b82f6', tabIds: [] });
  };

  const spaceTabCount = (spaceId: string) =>
    tabs.filter((t: { spaceId: string }) => t.spaceId === spaceId).length;

  return (
    <aside className="w-16 bg-orb-sidebar border-r border-white/5 flex flex-col z-20">
      <div className="flex flex-col items-center justify-between p-4 h-full">
        <div className="flex flex-col items-center gap-4">
          {/* App Logo */}
          <div className="w-8 h-8 rounded-lg bg-orb-accent flex items-center justify-center text-orb-dark font-bold text-lg">
            O
          </div>

          {/* Spaces List */}
          <div className="flex flex-col gap-1 w-full mt-4">
            {spaces.map((space) => (
              <button
                key={space.id}
                onClick={() => setActiveSpace(space.id)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  activeSpaceId === space.id
                    ? 'bg-white/10 ring-1 ring-orb-accent'
                    : 'hover:bg-white/5'
                }`}
                title={space.name}
              >
                <div className="relative flex items-center justify-center">
                  {getSpaceIcon(space.icon)}
                  {spaceTabCount(space.id) > 0 && (
                    <span className="absolute -right-1 -top-1 bg-orb-accent text-orb-dark text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {spaceTabCount(space.id)}
                    </span>
                  )}
                </div>
              </button>
            ))}
            <button
              onClick={handleNewSpace}
              className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
              title="New Space"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="flex flex-col items-center gap-2 pt-4">
          <button
            className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors"
            title="Boosts"
          >
            <Shield className="w-4 h-4" />
          </button>
          <button
            className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors"
            title="Settings"
          >
            <Bot className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
