import { describe, expect, it } from 'vitest';
import {
  decidePermission,
  hostFromUrl,
  isOrbPartition,
  isWebUrl,
  toOrbPermission,
  uniqueFilename,
} from '../../shared/sessionPolicy';

describe('session policy', () => {
  it('recognises Orb partitions only', () => {
    expect(isOrbPartition('persist:orb')).toBe(true);
    expect(isOrbPartition('persist:orb-profile-school')).toBe(true);
    expect(isOrbPartition('persist:something-else')).toBe(false);
    expect(isOrbPartition(undefined)).toBe(false);
  });

  it('only allows http(s) popups', () => {
    expect(isWebUrl('https://example.com')).toBe(true);
    expect(isWebUrl('http://example.com')).toBe(true);
    expect(isWebUrl('file:///etc/passwd')).toBe(false);
    expect(isWebUrl('javascript:alert(1)')).toBe(false);
    expect(isWebUrl('not a url')).toBe(false);
  });

  it('extracts and normalises hosts', () => {
    expect(hostFromUrl('https://Meet.Google.com/abc')).toBe('meet.google.com');
    expect(hostFromUrl('about:blank')).toBeNull();
    expect(hostFromUrl('nonsense')).toBeNull();
  });

  it('maps Electron permissions onto remembered ones', () => {
    expect(toOrbPermission('notifications')).toBe('notifications');
    expect(toOrbPermission('geolocation')).toBe('location');
    expect(toOrbPermission('display-capture')).toBe('screen');
    expect(toOrbPermission('media', ['audio'])).toBe('microphone');
    expect(toOrbPermission('media', ['video', 'audio'])).toBe('camera');
    expect(toOrbPermission('media', [])).toBe('microphone');
    expect(toOrbPermission('midi')).toBeNull();
  });

  it('denies unmanaged and sensitive permissions by default', () => {
    expect(decidePermission('midi', null)).toEqual({ action: 'deny' });
    expect(decidePermission('hid', 'allow')).toEqual({ action: 'deny' });
    expect(decidePermission('clipboard-read', 'allow')).toEqual({ action: 'deny' });
    expect(decidePermission('serial', null)).toEqual({ action: 'deny' });
  });

  it('allows harmless permissions without prompting', () => {
    expect(decidePermission('fullscreen', null)).toEqual({ action: 'allow' });
  });

  it('asks when a managed permission has no stored choice', () => {
    expect(decidePermission('notifications', 'ask')).toEqual({ action: 'ask', permission: 'notifications' });
    expect(decidePermission('geolocation', undefined)).toEqual({ action: 'ask', permission: 'location' });
    expect(decidePermission('media', 'ask', ['video'])).toEqual({ action: 'ask', permission: 'camera' });
  });

  it('honours stored allow and deny choices', () => {
    expect(decidePermission('media', 'allow', ['audio'])).toEqual({ action: 'allow' });
    expect(decidePermission('geolocation', 'deny')).toEqual({ action: 'deny' });
  });

  it('avoids clobbering existing download files', () => {
    const taken = new Set(['report.pdf', 'report (1).pdf']);
    expect(uniqueFilename('report.pdf', (name) => taken.has(name))).toBe('report (2).pdf');
    expect(uniqueFilename('fresh.txt', (name) => taken.has(name))).toBe('fresh.txt');
    expect(uniqueFilename('README', (name) => name === 'README')).toBe('README (1)');
  });
});
