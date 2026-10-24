import React, { useEffect, useState, useCallback } from 'react';

type PermissionRequest = {
  id: string;
  host: string;
  permission: string;
};

const PERMISSION_LABELS: Record<string, string> = {
  notifications: 'Show notifications',
  camera: 'Access your camera',
  microphone: 'Access your microphone',
  location: 'Access your location',
  screen: 'Share your screen',
};

export default function PermissionPrompt() {
  const [pending, setPending] = useState<PermissionRequest | null>(null);
  const [remember, setRemember] = useState(false);

  const handlePermissionRequest = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<PermissionRequest>;
    setPending(customEvent.detail);
    setRemember(false);
  }, []);

  useEffect(() => {
    window.addEventListener('orb:permission-request', handlePermissionRequest);
    return () => window.removeEventListener('orb:permission-request', handlePermissionRequest);
  }, [handlePermissionRequest]);

  if (!pending) return null;

  const respond = (allowed: boolean) => {
    window.orbApi?.permissionRespond(pending.id, allowed);
    if (remember) {
      window.orbApi?.setPermission(pending.host, pending.permission, allowed ? 'allow' : 'deny');
    }
    setPending(null);
  };

  const label = PERMISSION_LABELS[pending.permission] || pending.permission;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) respond(false); }}
    >
      <div className="orb-elevated orb-strong rounded-2xl border orb-border shadow-[0_20px_40px_rgba(41,37,36,0.2)] p-5 max-w-sm w-full">
        <div className="flex items-start gap-3 mb-4">
          <div className="orb-accent-soft orb-accent flex h-9 w-9 items-center justify-center rounded-full shrink-0 mt-0.5">
            <span className="text-[10px]">🔒</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="orb-text-strong text-sm font-medium mb-1">{pending.host}</div>
            <div className="orb-muted text-xs">{label}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <input
            id="remember"
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="orb-accent-soft orb-accent rounded"
          />
          <label htmlFor="remember" className="orb-muted text-xs">Remember this choice</label>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => respond(false)}
            className="orb-control flex-1 py-2 rounded-lg"
          >
            Deny
          </button>
          <button
            onClick={() => respond(true)}
            className="flex-1 py-2 rounded-lg bg-[var(--orb-accent)] text-white hover:bg-[var(--orb-accent-soft)]/50 transition-colors"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}
