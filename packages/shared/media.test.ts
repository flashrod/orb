import { describe, expect, it } from 'vitest';
import {
  TOGGLE_MEDIA_PLAYBACK_SCRIPT,
  TOGGLE_PIP_SCRIPT,
  canUsePictureInPicture,
} from './media';

describe('page media helpers', () => {
  it('honors site picture-in-picture opt-outs', () => {
    expect(canUsePictureInPicture('https://www.youtube.com/watch?v=1')).toBe(true);
    expect(canUsePictureInPicture('https://app.slack.com/client/T1/C2')).toBe(false);
    expect(canUsePictureInPicture('https://meet.google.com/abc-defg-hij')).toBe(false);
  });

  it('toggles page video and playback', () => {
    expect(TOGGLE_PIP_SCRIPT).toContain('requestPictureInPicture');
    expect(TOGGLE_PIP_SCRIPT).toContain('exitPictureInPicture');
    expect(TOGGLE_MEDIA_PLAYBACK_SCRIPT).toContain("querySelectorAll('video,audio')");
    expect(TOGGLE_MEDIA_PLAYBACK_SCRIPT).toContain('.pause()');
  });
});
