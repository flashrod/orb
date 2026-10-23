import React from 'react';
import { Plus, Trash, Code } from '@phosphor-icons/react';
import { useBoostStore } from '../stores/boosts';


export default function BoostsEditor() {
  const { boosts, addBoost, removeBoost, toggleBoost, updateBoost, loadBoosts } =
    useBoostStore();
  const [newDomain, setNewDomain] = React.useState('');
  const [newCss, setNewCss] = React.useState('');
  const [newJs, setNewJs] = React.useState('');

  React.useEffect(() => { void loadBoosts(); }, [loadBoosts]);

  const handleAddBoost = () => {
    if (!newDomain.trim()) return;
    addBoost({
      domain: newDomain.trim(),
      css: newCss,
      js: newJs,
      enabled: true,
    });
    setNewDomain('');
    setNewCss('');
    setNewJs('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Boosts</h2>
        <button
          onClick={handleAddBoost}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          <Plus className="w-3 h-3" /> Add Boost
        </button>
      </div>

      <div className="space-y-4">
        {boosts.length === 0 ? (
          <div className="card-base text-center py-8">
            <p className="text-white/50">No boosts yet. Add custom CSS/JS for any domain.</p>
          </div>
        ) : (
          boosts.map((boost: { id: string; domain: string; css: string; js: string; enabled: boolean }) => (
            <div
              key={boost.id}
              className="card-base flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-orb-accent">
                    📄
                  </div>
                  <div>
                    <div className="text-sm font-medium">{boost.domain}</div>
                    <div className="text-xs text-white/50">
                      {boost.css.length} CSS · {boost.js.length} JS
                    </div>
                  </div>
                  <button
                    onClick={() => removeBoost(boost.id)}
                    className="text-white/40 hover:text-white"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => toggleBoost(boost.id)}
                  className="relative inline-flex w-10 h-6 rounded-full bg-white/10 transition-colors focus:outline-none"
                  aria-label={boost.enabled ? 'Disable boost' : 'Enable boost'}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transform transition-transform ${
                      boost.enabled ? 'translate-x-4' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">CSS</label>
                  <textarea
                    value={boost.css}
                    onChange={(e) => updateBoost(boost.id, { css: e.target.value })}
                    className="w-full h-32 bg-white/5 border border-white/10 rounded-lg p-2 text-xs font-mono text-white/80 focus:outline-none focus:ring-1 focus:ring-orb-accent"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">JavaScript</label>
                  <textarea
                    value={boost.js}
                    onChange={(e) => updateBoost(boost.id, { js: e.target.value })}
                    className="w-full h-32 bg-white/5 border border-white/10 rounded-lg p-2 text-xs font-mono text-white/80 focus:outline-none focus:ring-1 focus:ring-orb-accent"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card-base p-4">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Domain</label>
            <input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
              className="input-base w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Custom CSS</label>
              <textarea
                value={newCss}
                onChange={(e) => setNewCss(e.target.value)}
                placeholder="/* custom styles */"
                className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-2 text-xs font-mono text-white/80 focus:outline-none focus:ring-1 focus:ring-orb-accent"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Custom JS</label>
              <textarea
                value={newJs}
                onChange={(e) => setNewJs(e.target.value)}
                placeholder="// custom script"
                className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-2 text-xs font-mono text-white/80 focus:outline-none focus:ring-1 focus:ring-orb-accent"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
