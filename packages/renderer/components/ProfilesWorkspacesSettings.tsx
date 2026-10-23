import React, { useMemo, useState } from 'react';
import { Check, Copy, Plus, Trash } from '@phosphor-icons/react';
import { useProfileStore } from '../stores/profiles';
import { useSpaceStore } from '../stores/spaces';
import { useTabStore } from '../stores/tabs';
import { useEssentialsStore } from '../stores/essentials';
import { DEFAULT_PROFILE } from '../../shared/profiles';
import { useBrowserPreferencesStore } from '../stores/preferences';

export default function ProfilesWorkspacesSettings() {
  const profiles = useProfileStore((state) => state.profiles);
  const { addProfile, renameProfile, recolorProfile, removeProfile } = useProfileStore();
  const { spaces, addSpace, updateSpace, removeSpace, reorderSpace } = useSpaceStore();
  const { tabs, addTab, moveTab } = useTabStore();
  const { sites, addSite, moveSpaceSites, moveProfileSites } = useEssentialsStore();
  const [profileName, setProfileName] = useState('');
  const essentialsScope = useBrowserPreferencesStore((state) => state.essentialsScope);
  const setEssentialsScope = useBrowserPreferencesStore((state) => state.setEssentialsScope);
  const [notice, setNotice] = useState('');
  const [pendingProfileDelete, setPendingProfileDelete] = useState<string | null>(null);
  const [profileNameDrafts, setProfileNameDrafts] = useState<Record<string, string>>({});
  const [destinationBySpace, setDestinationBySpace] = useState<Record<string, string>>({});
  const activeProfileDelete = profiles.find((profile) => profile.id === pendingProfileDelete);
  const defaultProfile = profiles.find((profile) => profile.id === DEFAULT_PROFILE.id) || profiles[0];
  const profilesById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);

  const createProfile = () => {
    const id = addProfile(profileName);
    if (!id) {
      setNotice('Use a unique profile name.');
      return;
    }
    setProfileName('');
    setNotice('Profile created. Assign it to a workspace below to use its isolated browser data.');
  };

  const duplicateWorkspace = (spaceId: string) => {
    const source = spaces.find((space) => space.id === spaceId);
    if (!source) return;
    addSpace({ name: `${source.name} copy`, icon: source.icon, color: source.color, tabIds: [], profileId: source.profileId });
    const copy = useSpaceStore.getState().spaces.at(-1);
    if (!copy) return;
    const sourceTabs = useTabStore.getState().tabs.filter((tab) => tab.spaceId === source.id);
    sourceTabs.forEach((tab) => addTab({ spaceId: copy.id, url: tab.url, title: tab.title, favicon: tab.favicon, isPinned: tab.isPinned, isActive: false }));
    useEssentialsStore.getState().sites.filter((site) => site.spaceId === source.id && site.scope !== 'profile').forEach((site) => addSite({ ...site, spaceId: copy.id }));
    setNotice(`“${source.name}” was duplicated with its tabs and Essentials.`);
  };

  const moveAndDeleteWorkspace = (spaceId: string) => {
    const destinationId = destinationBySpace[spaceId] || spaces.find((space) => space.id !== spaceId)?.id;
    if (!destinationId) return;
    const movedTabs = tabs.filter((tab) => tab.spaceId === spaceId);
    movedTabs.forEach((tab, index) => moveTab(tab.id, destinationId, useTabStore.getState().tabs.filter((item) => item.spaceId === destinationId).length + index));
    moveSpaceSites(spaceId, destinationId);
    const wasActive = useSpaceStore.getState().activeSpaceId === spaceId;
    removeSpace(spaceId);
    if (wasActive) useSpaceStore.getState().setActiveSpace(destinationId);
    setNotice(`Workspace and its tabs were moved to “${spaces.find((space) => space.id === destinationId)?.name || 'the selected workspace'}”.`);
  };

  const confirmDeleteProfile = async () => {
    if (!activeProfileDelete || !defaultProfile || activeProfileDelete.id === defaultProfile.id) return;
    try {
      const result = await window.orbApi?.clearProfileData(activeProfileDelete.id);
      if (!result?.cleared) {
        setNotice('Could not remove profile site data. The profile was kept.');
        return;
      }
    } catch {
      setNotice('Could not remove profile site data. The profile was kept.');
      return;
    }
    spaces.filter((space) => space.profileId === activeProfileDelete.id).forEach((space) => updateSpace(space.id, { profileId: defaultProfile.id }));
    moveProfileSites(activeProfileDelete.id, defaultProfile.id);
    removeProfile(activeProfileDelete.id);
    setPendingProfileDelete(null);
    setNotice(`Workspaces were moved to ${defaultProfile.name}; profile cookies, cache, and site storage were cleared.`);
  };

  return (
    <div className="mx-auto max-w-[720px] space-y-8">
      <section>
        <div className="mb-4"><h2 className="orb-strong text-sm font-semibold">Profiles</h2><p className="orb-muted mt-1 text-xs">Each profile uses a separate Chromium session for cookies, cache, permissions, and site storage. Assign profiles to workspaces below.</p></div>
        <form onSubmit={(event) => { event.preventDefault(); createProfile(); }} className="mb-3 flex gap-2">
          <input aria-label="New profile name" value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Add a profile" className="orb-strong orb-placeholder h-9 min-w-0 flex-1 rounded-md border orb-border bg-transparent px-3 text-xs outline-none focus:border-[var(--orb-accent)]" />
          <button type="submit" disabled={!profileName.trim()} className="orb-accent-bg flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-white disabled:opacity-40"><Plus className="h-3.5 w-3.5" /> Add profile</button>
        </form>
        <div className="space-y-2">
          {profiles.map((profile) => {
            const assigned = spaces.filter((space) => space.profileId === profile.id).length;
            return <div key={profile.id} className="orb-elevated flex items-center gap-3 rounded-md border orb-border px-3 py-2">
              <input type="color" value={profile.color} onChange={(event) => recolorProfile(profile.id, event.target.value)} aria-label={`${profile.name} profile color`} className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0" />
              <input value={profileNameDrafts[profile.id] ?? profile.name} aria-label={`${profile.name} profile name`} onChange={(event) => setProfileNameDrafts((drafts) => ({ ...drafts, [profile.id]: event.target.value }))} onBlur={() => {
                const draft = profileNameDrafts[profile.id];
                if (draft === undefined) return;
                if (!renameProfile(profile.id, draft)) setNotice('Profile names must be unique and cannot be empty.');
                else setNotice('');
                setProfileNameDrafts((drafts) => { const next = { ...drafts }; delete next[profile.id]; return next; });
              }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') setProfileNameDrafts((drafts) => { const next = { ...drafts }; delete next[profile.id]; return next; }); }} className="orb-strong min-w-0 flex-1 bg-transparent text-xs outline-none" />
              <span className="orb-muted whitespace-nowrap text-[10px]">{assigned} {assigned === 1 ? 'workspace' : 'workspaces'}</span>
              {profile.id === defaultProfile?.id ? <span className="orb-muted rounded border orb-border px-2 py-1 text-[10px]">Default</span> : <button type="button" aria-label={`Delete ${profile.name} profile`} onClick={() => setPendingProfileDelete(profile.id)} className="orb-control flex h-7 w-7 items-center justify-center rounded"><Trash className="h-3.5 w-3.5" /></button>}
            </div>;
          })}
        </div>
      </section>

      <section className="border-t orb-border pt-6">
        <div className="mb-4"><h2 className="orb-strong text-sm font-semibold">Essentials scope</h2><p className="orb-muted mt-1 text-xs">Choose whether new Essentials stay with one workspace or appear in every workspace using the same profile. Existing pins remain workspace-scoped.</p></div>
        <div role="radiogroup" aria-label="Essentials scope" className="grid grid-cols-2 gap-2">
          {(['workspace', 'profile'] as const).map((scope) => <button key={scope} type="button" role="radio" aria-checked={scope === essentialsScope} onClick={() => setEssentialsScope(scope)} className={`rounded-md border px-3 py-2 text-left text-xs ${scope === essentialsScope ? 'orb-accent-soft orb-accent border-[var(--orb-accent)]' : 'orb-control orb-border'}`}>{scope === 'workspace' ? 'This workspace' : 'All workspaces in profile'}</button>)}
        </div>
      </section>

      <section className="border-t orb-border pt-6">
        <div className="mb-4"><h2 className="orb-strong text-sm font-semibold">Workspaces</h2><p className="orb-muted mt-1 text-xs">Rename, recolor, reorder, duplicate, or move a workspace and its tabs before removing it.</p></div>
        <div className="space-y-2">
          {spaces.map((space, index) => <div key={space.id} className="orb-elevated rounded-md border orb-border p-3">
            <div className="flex items-center gap-2">
              <input type="color" value={space.color} onChange={(event) => updateSpace(space.id, { color: event.target.value })} aria-label={`${space.name} workspace color`} className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0" />
              <input value={space.name} aria-label={`${space.name} workspace name`} onChange={(event) => updateSpace(space.id, { name: event.target.value.slice(0, 48) })} className="orb-strong min-w-0 flex-1 bg-transparent text-xs outline-none" />
              <select aria-label={`Profile for ${space.name}`} value={profilesById.has(space.profileId) ? space.profileId : defaultProfile?.id} onChange={(event) => updateSpace(space.id, { profileId: event.target.value })} className="orb-strong h-8 max-w-40 rounded-md border orb-border bg-[var(--orb-elevated)] px-2 text-[11px] outline-none">
                {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
              </select>
              <button type="button" disabled={index === 0} aria-label={`Move ${space.name} up`} onClick={() => reorderSpace(space.id, index - 1)} className="orb-control h-7 w-7 rounded disabled:opacity-30">↑</button>
              <button type="button" disabled={index === spaces.length - 1} aria-label={`Move ${space.name} down`} onClick={() => reorderSpace(space.id, index + 1)} className="orb-control h-7 w-7 rounded disabled:opacity-30">↓</button>
              <button type="button" aria-label={`Duplicate ${space.name}`} onClick={() => duplicateWorkspace(space.id)} className="orb-control flex h-7 w-7 items-center justify-center rounded"><Copy className="h-3.5 w-3.5" /></button>
            </div>
            {spaces.length > 1 && <div className="mt-3 flex items-center gap-2 border-t orb-border pt-2">
              <label className="orb-muted text-[10px]" htmlFor={`move-${space.id}`}>Before deleting, move tabs and Essentials to</label>
              <select id={`move-${space.id}`} value={destinationBySpace[space.id] || spaces.find((item) => item.id !== space.id)?.id} onChange={(event) => setDestinationBySpace((current) => ({ ...current, [space.id]: event.target.value }))} className="orb-strong h-7 min-w-0 flex-1 rounded border orb-border bg-[var(--orb-elevated)] px-2 text-[10px]">
                {spaces.filter((item) => item.id !== space.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <button type="button" onClick={() => moveAndDeleteWorkspace(space.id)} className="orb-control flex h-7 items-center gap-1 rounded px-2 text-[10px]"><Trash className="h-3 w-3" /> Move & delete</button>
            </div>}
          </div>)}
        </div>
        <button type="button" onClick={() => { addSpace({ name: 'New workspace', icon: 'globe', color: '#a0522d', tabIds: [], profileId: defaultProfile?.id }); setNotice('Workspace created.'); }} className="orb-control mt-3 flex h-9 items-center gap-2 rounded-md border border-dashed orb-border px-3 text-xs"><Plus className="h-3.5 w-3.5" /> New workspace</button>
      </section>

      {notice && <p role="status" className="orb-muted text-xs">{notice}</p>}
      {activeProfileDelete && defaultProfile && <div role="dialog" aria-modal="true" aria-label="Confirm profile deletion" className="orb-elevated fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/25 p-6">
        <div className="orb-surface w-full max-w-sm rounded-xl border orb-border p-5 shadow-xl">
          <h3 className="orb-strong text-sm font-semibold">Delete {activeProfileDelete.name}?</h3>
          <p className="orb-muted mt-2 text-xs leading-5">Move its {spaces.filter((space) => space.profileId === activeProfileDelete.id).length} assigned workspaces to {defaultProfile.name}, then permanently clear this profile’s cookies, cache, and site storage.</p>
          <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setPendingProfileDelete(null)} className="orb-control rounded-md px-3 py-2 text-xs">Cancel</button><button type="button" onClick={confirmDeleteProfile} className="orb-accent-bg flex items-center gap-1 rounded-md px-3 py-2 text-xs text-white"><Check className="h-3.5 w-3.5" /> Move workspaces & delete</button></div>
        </div>
      </div>}
    </div>
  );
}
