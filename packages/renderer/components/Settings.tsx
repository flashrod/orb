import React from 'react';
import { useAdBlockerStore } from '../stores/adBlocker';
import { Shield, Globe, CheckCircle } from 'lucide-react';

export default function Settings() {
  const { enabled, toggle } = useAdBlockerStore();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Settings</h2>

      <div className="card-base">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-orb-accent" />
            <div>
              <div className="text-sm font-medium">Ad Blocker</div>
              <div className="text-xs text-white/50">
                Block ads, trackers, and cookie banners
              </div>
            </div>
          </div>
          <button
            onClick={toggle}
            className="relative inline-flex w-10 h-6 rounded-full transition-colors focus:outline-none"
            aria-label="Toggle ad blocker"
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transform transition-transform ${
                enabled ? 'translate-x-4' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <div className="px-4 pb-4 flex items-center gap-2 text-xs text-white/50">
          {enabled && <CheckCircle className="w-3 h-3 text-green-400" />}
          <span>Ad blocker is {enabled ? 'enabled' : 'disabled'}</span>
        </div>
      </div>

      <div className="card-base p-4">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-orb-accent" />
          <div>
            <div className="text-sm font-medium">Import from Arc</div>
            <div className="text-xs text-white/50">Import bookmarks, tabs, and spaces</div>
          </div>
        </div>
        <button className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
          Import Arc Data
        </button>
      </div>
    </div>
  );
}
