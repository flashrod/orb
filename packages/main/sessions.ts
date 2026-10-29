import fs from 'node:fs';
import path from 'node:path';
import { BrowserWindow, session, type DownloadItem, type Session } from 'electron';
import type { PermissionName, PermissionStore } from './permissions';
import type { DownloadState, DownloadStore } from './downloads';
import { decidePermission, hostFromUrl, uniqueFilename } from '../shared/sessionPolicy';
import type { OrbPermissionName } from '../shared/sessionPolicy';
import { buildUserAgent } from '../shared/userAgent';

export { isOrbPartition, isWebUrl } from '../shared/sessionPolicy';

export type PendingPermission = {
  resolve: (allowed: boolean) => void;
  timeout: ReturnType<typeof setTimeout>;
};

export type SessionContext = {
  permissionStore: PermissionStore;
  pendingPermissions: Map<string, PendingPermission>;
  downloadStore: DownloadStore;
  getDownloadPath: () => string;
  activeDownloads: Map<string, DownloadItem>;
  permissionTimeoutMs?: number;
};

const DEFAULT_PERMISSION_TIMEOUT_MS = 30_000;

// Electron returns the same Session instance for a partition, so identity is a
// safe way to make hardening idempotent across repeated webview attaches.
const hardenedSessions = new WeakSet<Session>();
const knownSessions = new Set<Session>();

/** Sends a push event to every live shell window. */
export function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    win.webContents.send(channel, payload);
  }
}

function publishDownload(ctx: SessionContext, id: string): void {
  const item = ctx.downloadStore.get(id);
  if (item) broadcast('orb:download-updated', item);
}

function requestPermission(
  ctx: SessionContext,
  host: string,
  permission: OrbPermissionName,
  respond: (allowed: boolean) => void,
): void {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let settled = false;

  const finish = (allowed: boolean) => {
    if (settled) return;
    settled = true;
    clearTimeout(state.timer);
    ctx.pendingPermissions.delete(id);
    respond(allowed);
  };

  const state: { timer: ReturnType<typeof setTimeout> } = {
    timer: setTimeout(() => finish(false), ctx.permissionTimeoutMs ?? DEFAULT_PERMISSION_TIMEOUT_MS),
  };

  ctx.pendingPermissions.set(id, { resolve: finish, timeout: state.timer });
  broadcast('orb:permission-request', { id, host, permission });
}

function installPermissionPolicy(ses: Session, ctx: SessionContext): void {
  ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const requestingUrl = (details as { requestingUrl?: string } | undefined)?.requestingUrl
      || webContents?.getURL()
      || '';
    const host = hostFromUrl(requestingUrl);
    if (!host) {
      callback(false);
      return;
    }

    const mediaTypes = (details as { mediaTypes?: string[] } | undefined)?.mediaTypes;
    const stored = ctx.permissionStore.get(host, permission as PermissionName);
    const decision = decidePermission(permission, stored, mediaTypes);

    if (decision.action === 'allow') {
      callback(true);
      return;
    }
    if (decision.action === 'deny') {
      callback(false);
      return;
    }
    requestPermission(ctx, host, decision.permission, callback);
  });

  ses.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
    const host = hostFromUrl(requestingOrigin) ?? hostFromUrl(_webContents?.getURL() ?? '');
    if (!host) return false;
    const stored = ctx.permissionStore.get(host, permission as PermissionName);
    return decidePermission(permission, stored).action === 'allow';
  });
}

function installDownloadPolicy(ses: Session, ctx: SessionContext): void {
  ses.on('will-download', (_event, item) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const directory = ctx.getDownloadPath();
    const filename = uniqueFilename(item.getFilename() || 'download', (candidate) =>
      fs.existsSync(path.join(directory, candidate)),
    );
    const filePath = path.join(directory, filename);

    // Do not call event.preventDefault(): that cancels the download entirely.
    item.setSavePath(filePath);
    ctx.activeDownloads.set(id, item);

    ctx.downloadStore.add({
      id,
      url: item.getURL() || '',
      filePath,
      totalBytes: item.getTotalBytes(),
      receivedBytes: item.getReceivedBytes(),
      state: 'progressing',
      startedAt: Date.now(),
      completedAt: null,
    });
    publishDownload(ctx, id);

    item.on('updated', (_itemEvent, state) => {
      ctx.downloadStore.update(id, {
        receivedBytes: item.getReceivedBytes(),
        totalBytes: item.getTotalBytes(),
        state: state as DownloadState,
      });
      publishDownload(ctx, id);
    });

    item.on('done', (_itemEvent, state) => {
      ctx.activeDownloads.delete(id);
      ctx.downloadStore.update(id, {
        state: state as DownloadState,
        completedAt: state === 'completed' ? Date.now() : null,
        receivedBytes: item.getReceivedBytes(),
        totalBytes: item.getTotalBytes(),
      });
      publishDownload(ctx, id);
    });
  });
}

/**
 * Electron cancels discoverable-credential (passkey) requests with a
 * `NotAllowedError` when no listener is registered for this event, even when a
 * single credential matches. Orb has no account picker yet, so it takes the
 * first account the authenticator offers.
 *
 * Platform passkeys (iCloud Keychain, 1Password, Bitwarden) additionally need
 * `app.configureWebAuthn({ platformPasskeys: true })` plus Apple entitlements;
 * that is wired up in the app entry point.
 */
function installWebAuthnPolicy(ses: Session): void {
  ses.on('select-webauthn-account', (_event, details, callback) => {
    callback(details.accounts[0]?.credentialId ?? null);
  });
}

/**
 * Installs popup, permission and download policy on a session. Safe to call
 * repeatedly; each session is only hardened once.
 */
export function hardenSession(ses: Session, ctx: SessionContext): void {
  if (hardenedSessions.has(ses)) return;
  hardenedSessions.add(ses);

  // Chrome-style UA that does not reveal Orb or Electron.
  ses.setUserAgent(buildUserAgent());

  installPermissionPolicy(ses, ctx);
  installDownloadPolicy(ses, ctx);
  installWebAuthnPolicy(ses);
}

/** Returns the hardened session for an Orb partition. */
export function orbSessionFor(partition: string, ctx: SessionContext): Session {
  const ses = session.fromPartition(partition, { cache: true });
  knownSessions.add(ses);
  hardenSession(ses, ctx);
  return ses;
}

/**
 * Every session Orb has created, across the default profile and each Space
 * profile. "Clear browsing data" needs all of them: a user does not think of
 * profiles as separate stores.
 */
export function orbSessions(): Session[] {
  return [...knownSessions];
}
