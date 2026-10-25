import { app, BrowserWindow, dialog, type WebContents } from 'electron';
import { certificateHost, certificateWarningDetail } from '../shared/certificates';

/**
 * Hosts the user has explicitly trusted for this app session. Certificate
 * exceptions are deliberately not persisted: a bad network today should not
 * silently weaken every future launch.
 */
const allowedHosts = new Set<string>();
const pendingHosts = new Set<string>();

function parentWindowFor(webContents: WebContents): BrowserWindow | undefined {
  return BrowserWindow.fromWebContents(webContents)
    ?? BrowserWindow.getFocusedWindow()
    ?? BrowserWindow.getAllWindows()[0]
    ?? undefined;
}

async function askToContinue(webContents: WebContents, host: string, error: string): Promise<boolean> {
  const options: Electron.MessageBoxOptions = {
    type: 'warning',
    buttons: ['Cancel', 'Continue'],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
    title: 'Certificate problem',
    message: `Orb can't verify the identity of “${host}”`,
    detail: certificateWarningDetail(host, error),
  };
  const parent = parentWindowFor(webContents);
  const result = parent
    ? await dialog.showMessageBox(parent, options)
    : await dialog.showMessageBox(options);
  return result.response === 1;
}

/**
 * Chromium rejects invalid certificates by default. This handler gives the
 * user a deliberate, per-host opt-in instead of a dead end.
 */
export function registerCertificateErrorHandler(): void {
  app.on('certificate-error', (event, webContents, url, error, _certificate, callback) => {
    event.preventDefault();

    const settle = (allow: boolean) => {
      try {
        callback(allow);
      } catch {
        // The request may have been cancelled while the prompt was open.
      }
    };

    const host = certificateHost(url);
    if (allowedHosts.has(host)) {
      settle(true);
      return;
    }

    // A page can trigger many requests at once. Fail the extra ones instead of
    // stacking one dialog per subresource.
    if (pendingHosts.has(host)) {
      settle(false);
      return;
    }
    pendingHosts.add(host);

    void askToContinue(webContents, host, error)
      .then((allow) => {
        pendingHosts.delete(host);
        if (allow) allowedHosts.add(host);
        settle(allow);
      })
      .catch(() => {
        pendingHosts.delete(host);
        settle(false);
      });
  });
}
