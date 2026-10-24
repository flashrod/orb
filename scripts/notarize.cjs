const path = require('node:path');
const { notarize } = require('@electron/notarize');

/**
 * electron-builder afterSign hook.
 *
 * Runs only on macOS and only when Apple credentials are present, so local
 * unsigned builds and unsigned CI builds keep working. @electron/notarize
 * staples the ticket to the app after a successful submission.
 */
async function notarizeOrb(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  const appleApiKey = process.env.APPLE_API_KEY;
  const appleApiKeyId = process.env.APPLE_API_KEY_ID;
  const appleApiIssuer = process.env.APPLE_API_ISSUER;
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  const apiKeyOptions = appleApiKey && appleApiKeyId && appleApiIssuer
    ? { appleApiKey, appleApiKeyId, appleApiIssuer }
    : null;
  const appleIdOptions = appleId && appleIdPassword && teamId
    ? { appleId, appleIdPassword, teamId }
    : null;

  if (!apiKeyOptions && !appleIdOptions) {
    console.log('[notarize] No Apple credentials found; skipping notarization.');
    return;
  }

  console.log(`[notarize] Submitting ${appPath}`);
  await notarize({ appPath, ...(apiKeyOptions || appleIdOptions) });
  console.log('[notarize] Notarized and stapled.');
}

module.exports = notarizeOrb;
module.exports.default = notarizeOrb;
