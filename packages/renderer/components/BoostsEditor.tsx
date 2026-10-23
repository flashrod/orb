import React, { useEffect, useState } from 'react';
import { Code, FloppyDisk, Plus, Trash, X } from '@phosphor-icons/react';
import { useBoostStore, Boost } from '../stores/boosts';

type Draft = Pick<Boost, 'domain' | 'css' | 'js'>;

export default function BoostsEditor() {
  const { boosts, loaded, error, loadBoosts, addBoost, removeBoost, toggleBoost, updateBoost } = useBoostStore();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [newDomain, setNewDomain] = useState('');
  const [newType, setNewType] = useState<'css' | 'js'>('css');
  const [newCode, setNewCode] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => { void loadBoosts(); }, [loadBoosts]);

  const getDraft = (boost: Boost): Draft => drafts[boost.id] || { domain: boost.domain, css: boost.css, js: boost.js };
  const hasChanges = (boost: Boost) => {
    const draft = drafts[boost.id];
    return Boolean(draft && (draft.domain !== boost.domain || draft.css !== boost.css || draft.js !== boost.js));
  };

  const save = async (boost: Boost) => {
    const draft = getDraft(boost);
    setSaving(boost.id);
    await updateBoost(boost.id, { ...draft, domain: draft.domain.trim().toLowerCase() });
    if (!useBoostStore.getState().error) {
      setDrafts((current) => { const next = { ...current }; delete next[boost.id]; return next; });
      setMessage(`Saved changes for ${draft.domain}.`);
    }
    setSaving(null);
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    const domain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain || !newCode.trim()) return;
    setSaving('new');
    await addBoost({ domain, css: newType === 'css' ? newCode : '', js: newType === 'js' ? newCode : '', enabled: true });
    if (!useBoostStore.getState().error) {
      setNewDomain(''); setNewCode('');
      setMessage(`Added a ${newType.toUpperCase()} Boost for ${domain}.`);
    }
    setSaving(null);
  };

  if (!loaded) return <p className="orb-muted text-xs">Loading saved Boosts…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="orb-strong text-sm font-semibold">Website Boosts</h2>
        <p className="orb-muted mt-1 text-xs leading-5">Save CSS and JavaScript adjustments for individual sites. Changes are stored locally on this device.</p>
      </div>

      {error && <p role="alert" className="rounded-md border border-red-300/60 bg-red-50/60 px-3 py-2 text-xs text-red-800">{error}</p>}
      {message && <p role="status" className="orb-accent-soft orb-accent rounded-md px-3 py-2 text-xs">{message}</p>}

      {boosts.length === 0 ? (
        <div className="orb-elevated rounded-lg border border-dashed orb-border px-4 py-6 text-center">
          <Code aria-hidden="true" className="orb-muted mx-auto mb-2 h-5 w-5" />
          <p className="orb-strong text-xs font-medium">No saved Boosts yet</p>
          <p className="orb-muted mt-1 text-[11px]">Use the element picker on a page or add a rule below.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {boosts.map((boost) => {
            const draft = getDraft(boost);
            return <article key={boost.id} className="orb-elevated overflow-hidden rounded-lg border orb-border">
              <header className="flex items-center gap-3 border-b orb-border px-3 py-2.5">
                <Code aria-hidden="true" className="orb-accent h-4 w-4" />
                <input aria-label="Boost domain" value={draft.domain} onChange={(event) => setDrafts((current) => ({ ...current, [boost.id]: { ...getDraft(boost), domain: event.target.value } }))}
                  className="orb-strong min-w-0 flex-1 bg-transparent text-xs font-medium outline-none" />
                <span className="orb-muted text-[10px]">{boost.css ? 'CSS' : ''}{boost.css && boost.js ? ' · ' : ''}{boost.js ? 'JS' : ''}</span>
                <button type="button" role="switch" aria-label={`Enable Boost for ${boost.domain}`} aria-checked={boost.enabled} onClick={() => void toggleBoost(boost.id)} className={`relative h-5 w-9 rounded-full transition-colors ${boost.enabled ? 'bg-[var(--orb-accent)]' : 'bg-[var(--orb-border-strong)]'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${boost.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'}`} /></button>
                <button type="button" aria-label={`Remove Boost for ${boost.domain}`} onClick={() => void removeBoost(boost.id)} className="orb-control flex h-7 w-7 items-center justify-center rounded"><Trash className="h-3.5 w-3.5" /></button>
              </header>
              <div className="grid gap-3 p-3">
                <label className="orb-muted text-[10px] font-medium">CSS<textarea value={draft.css} onChange={(event) => setDrafts((current) => ({ ...current, [boost.id]: { ...getDraft(boost), css: event.target.value } }))} rows={4} spellCheck={false} className="orb-frame mt-1.5 w-full resize-y rounded-md border orb-border p-2 font-mono text-[11px] leading-5 orb-strong outline-none focus:border-[var(--orb-accent)]" /></label>
                <label className="orb-muted text-[10px] font-medium">JavaScript<textarea value={draft.js} onChange={(event) => setDrafts((current) => ({ ...current, [boost.id]: { ...getDraft(boost), js: event.target.value } }))} rows={3} spellCheck={false} className="orb-frame mt-1.5 w-full resize-y rounded-md border orb-border p-2 font-mono text-[11px] leading-5 orb-strong outline-none focus:border-[var(--orb-accent)]" /></label>
                {hasChanges(boost) && <div className="flex justify-end gap-2"><button type="button" onClick={() => setDrafts((current) => { const next = { ...current }; delete next[boost.id]; return next; })} className="orb-control flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px]"><X className="h-3 w-3" />Discard</button><button type="button" disabled={saving === boost.id} onClick={() => void save(boost)} className="orb-accent-bg flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-white disabled:opacity-60"><FloppyDisk className="h-3.5 w-3.5" />{saving === boost.id ? 'Saving…' : 'Save changes'}</button></div>}
              </div>
            </article>;
          })}
        </div>
      )}

      <form onSubmit={(event) => void create(event)} className="orb-elevated space-y-3 rounded-lg border orb-border p-4">
        <div className="flex items-center gap-2"><Plus className="orb-accent h-4 w-4" /><h3 className="orb-strong text-xs font-semibold">Add a site Boost</h3></div>
        <label className="orb-muted block text-[10px] font-medium">Website domain<input required value={newDomain} onChange={(event) => setNewDomain(event.target.value)} placeholder="example.com" className="orb-frame mt-1.5 w-full rounded-md border orb-border px-2.5 py-2 text-xs orb-strong outline-none focus:border-[var(--orb-accent)]" /></label>
        <div className="flex items-center gap-3"><label className="orb-muted text-[10px] font-medium">Code type<select value={newType} onChange={(event) => setNewType(event.target.value as 'css' | 'js')} className="orb-frame ml-2 rounded-md border orb-border px-2 py-1.5 text-xs orb-strong"><option value="css">CSS</option><option value="js">JavaScript</option></select></label></div>
        <label className="orb-muted block text-[10px] font-medium">{newType === 'css' ? 'CSS rules' : 'JavaScript'}<textarea required value={newCode} onChange={(event) => setNewCode(event.target.value)} rows={4} spellCheck={false} className="orb-frame mt-1.5 w-full resize-y rounded-md border orb-border p-2 font-mono text-[11px] leading-5 orb-strong outline-none focus:border-[var(--orb-accent)]" /></label>
        <div className="flex justify-end"><button type="submit" disabled={saving === 'new'} className="orb-accent-bg flex items-center gap-1.5 rounded-md px-3 py-2 text-[11px] font-medium text-white disabled:opacity-60"><Plus className="h-3.5 w-3.5" />{saving === 'new' ? 'Adding…' : 'Add Boost'}</button></div>
      </form>
    </div>
  );
}
