import { describe, expect, it } from 'vitest';
import {
  certificateErrorMessage,
  certificateHost,
  certificateWarningDetail,
} from './certificates';

describe('certificate errors', () => {
  it('extracts the host from a URL', () => {
    expect(certificateHost('https://expired.example.com/login')).toBe('expired.example.com');
    expect(certificateHost('not a url')).toBe('not a url');
  });

  it('explains common Chromium certificate failures', () => {
    expect(certificateErrorMessage('net::ERR_CERT_DATE_INVALID')).toContain('expired');
    expect(certificateErrorMessage('net::ERR_CERT_COMMON_NAME_INVALID')).toContain('different address');
    expect(certificateErrorMessage('net::ERR_CERT_AUTHORITY_INVALID')).toContain('not trusted');
    expect(certificateErrorMessage('net::ERR_UNKNOWN')).toContain('could not be verified');
  });

  it('names the host in the warning', () => {
    const detail = certificateWarningDetail('expired.example.com', 'net::ERR_CERT_DATE_INVALID');
    expect(detail).toContain('expired.example.com');
    expect(detail).toContain('trust this network');
  });
});
