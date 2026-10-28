/**
 * HTTPS-only upgrade policy.
 *
 * Kept free of Electron imports so the decisions can be unit-tested in Node.
 *
 * Rules:
 * - Only top-level navigations are upgraded. Rewriting subresources breaks
 *   sites that still serve images or scripts over plain HTTP, and the failure
 *   is invisible to the user.
 * - Loopback, link-local, and private-network hosts are left alone. They
 *   usually have no certificate and the user typed them on purpose.
 * - A navigation that fails for a *connection* reason falls back to HTTP.
 *   Certificate failures never fall back: downgrading there would turn a
 *   man-in-the-middle into a working page.
 */

/** Chromium net error codes that mean "the HTTPS endpoint does not exist". */
const FALLBACK_ERROR_CODES = new Set([
  -7, // ERR_TIMED_OUT
  -21, // ERR_NETWORK_CHANGED
  -100, // ERR_CONNECTION_CLOSED
  -101, // ERR_CONNECTION_RESET
  -102, // ERR_CONNECTION_REFUSED
  -103, // ERR_CONNECTION_ABORTED
  -104, // ERR_CONNECTION_FAILED
  -105, // ERR_NAME_NOT_RESOLVED
  -106, // ERR_INTERNET_DISCONNECTED
  -107, // ERR_SSL_PROTOCOL_ERROR
  -109, // ERR_ADDRESS_UNREACHABLE
  -113, // ERR_SSL_VERSION_OR_CIPHER_MISMATCH
  -118, // ERR_CONNECTION_TIMED_OUT
  -324, // ERR_EMPTY_RESPONSE
  -337, // ERR_HTTP2_PROTOCOL_ERROR
  -356, // ERR_QUIC_PROTOCOL_ERROR
]);

/** Hosts that should never be rewritten to HTTPS. */
export function isUpgradeableHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) return false;
  if (host === 'localhost' || host.endsWith('.localhost')) return false;
  if (host === '0.0.0.0' || host === '::1' || host === '[::1]') return false;
  if (/^127\./.test(host)) return false;
  if (/^10\./.test(host)) return false;
  if (/^192\.168\./.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  if (/^169\.254\./.test(host)) return false;
  if (/\.local$/.test(host)) return false;
  return true;
}

/**
 * The HTTPS URL to redirect this request to, or null to leave it alone.
 *
 * @param url          The request URL.
 * @param resourceType Electron resource type, e.g. 'mainFrame'.
 * @param isException  True if the host is on the user's HTTPS exception list.
 */
export function httpsUpgradeTarget(
  url: string,
  resourceType: string,
  isException: (host: string) => boolean = () => false,
): string | null {
  if (resourceType !== 'mainFrame') return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:') return null;
  if (!isUpgradeableHost(parsed.hostname)) return null;
  if (isException(parsed.hostname)) return null;

  // A non-default port means the service is explicitly bound there; the same
  // port almost never speaks TLS, so upgrading would just fail.
  if (parsed.port) return null;

  parsed.protocol = 'https:';
  return parsed.toString();
}

/**
 * True if a failed HTTPS navigation should be retried over HTTP.
 * Certificate errors (ERR_CERT_* are -200..-299) are deliberately excluded.
 */
export function shouldFallBackToHttp(errorCode: number): boolean {
  return FALLBACK_ERROR_CODES.has(errorCode);
}

/** Turn user input ("https://Example.com/path", "example.com") into a bare host. */
export function normalizeExceptionDomain(value: string): string {
  const raw = value.trim().toLowerCase();
  if (!raw) return '';
  try {
    return new URL(raw.includes('://') ? raw : `https://${raw}`).hostname.toLowerCase();
  } catch {
    return '';
  }
}
