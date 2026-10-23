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
    <aside className="w-16 bg-white border-r border-zinc-200 flex flex-col z-20">
      <div className="flex flex-col items-center justify-between p-4 h-full">
        <div className="flex flex-col items-center gap-4">
          {/* App Logo */}
          <div className="w-8 h-8 rounded-md bg-zinc-900 flex items-center justify-center text-white font-medium text-lg">
            O
          </div>

          {/* Spaces List */}
          <div className="flex flex-col gap-1 w-full mt-4">
            {spaces.map((space) => (
              <button
                key={space.id}
                onClick={() => setActiveSpace(space.id)}
                className={`w-10 h-10 rounded-md flex items-center justify-center transition-all duration-150 ${
                  activeSpaceId === space.id
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
                title={space.name}
              >
                <div className="relative flex items-center justify-center">
                  <span
                    className={`w-5 h-5 ${activeSpaceId === space.id ? 'text-white' : 'text-zinc-400'}`}
                  >
                    {getSpaceIcon(space.icon)}
                  </span>
                  {spaceTabCount(space.id) > 0 && (
                    <span className="absolute -right-1 -top-1 bg-zinc-900 text-white text-[10px] font-bold rounded-full w-3 h-3 flex items-center justify-center">
                      {Math.min(spaceTabCount(space.id), 9)}
                    </span>
                  )}
                </div>
              </button>
            ))}
            <button
              onClick={handleNewSpace}
              className="w-10 h-10 rounded-md border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
              title="New Space"
            >
              <Plus className="w-4 h-4 text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="flex flex-col items-center gap-2 pt-4">
          <button
            className="w-8 h-8 rounded-md hover:bg-zinc-50 flex items-center justify-center transition-colors"
            title="Boosts"
          >
            <Shield className="w-4 h-4 text-zinc-500" />
          </button>
          <button
            className="w-8 h-8 rounded-md hover:bg-zinc-50 flex items-center justify-center transition-colors"
            title="Settings"
          >
            <Bot className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
      </div>
    </aside>
  );
}
