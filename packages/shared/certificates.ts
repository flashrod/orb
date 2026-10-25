/** Human-readable certificate errors and the host they belong to. */

const CERTIFICATE_ERRORS: Readonly<Record<string, string>> = {
  'net::ERR_CERT_AUTHORITY_INVALID': 'The certificate is not trusted by a known certificate authority.',
  'net::ERR_CERT_COMMON_NAME_INVALID': 'The certificate is issued for a different address.',
  'net::ERR_CERT_DATE_INVALID': 'The certificate has expired or is not valid yet.',
  'net::ERR_CERT_REVOKED': 'The certificate has been revoked.',
  'net::ERR_CERT_WEAK_SIGNATURE_ALGORITHM': 'The certificate uses an outdated signature algorithm.',
  'net::ERR_CERT_WEAK_KEY': 'The certificate uses a key that is too weak.',
  'net::ERR_CERT_CONTAINS_ERRORS': 'The certificate contains errors.',
  'net::ERR_CERT_INVALID': 'The certificate is invalid.',
  'net::ERR_CERT_SYMANTEC_LEGACY': 'The certificate uses a legacy authority that is no longer trusted.',
  'net::ERR_SSL_VERSION_OR_CIPHER_MISMATCH': 'The site only supports an outdated, insecure connection.',
};

export function certificateHost(url: string): string {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
}

export function certificateErrorMessage(error: string): string {
  return CERTIFICATE_ERRORS[error] || 'The certificate could not be verified.';
}

export function certificateWarningDetail(host: string, error: string): string {
  return `Orb can't verify the identity of “${host}”.\n\n${certificateErrorMessage(error)}\n\nOnly continue if you trust this network. Orb will remember this choice for the rest of the session.`;
}
