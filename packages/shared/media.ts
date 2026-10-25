/** Page-side media helpers shared by the webview and native-tab engines. */

import { pipPolicyFor } from './siteBehavior';

export interface MediaActionResult {
  ok: boolean;
  active?: boolean;
  playing?: boolean;
  error?: string;
}

/** Whether this site opts out of automatic/available picture-in-picture. */
export function canUsePictureInPicture(url: string): boolean {
  return pipPolicyFor(url).autoEnter;
}

/**
 * Runs in the page. Toggles an existing PiP window, otherwise promotes the
 * first playing (or ready) video. Always resolves to `MediaActionResult`.
 */
export const TOGGLE_PIP_SCRIPT = `(async () => {
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      return { ok: true, active: false };
    }
    if (document.pictureInPictureEnabled === false) {
      return { ok: false, error: 'Picture-in-picture is not available on this page.' };
    }
    const videos = Array.from(document.querySelectorAll('video'));
    const video = videos.find((item) => !item.paused && item.readyState > 0)
      || videos.find((item) => item.readyState > 0)
      || videos[0];
    if (!video) return { ok: false, error: 'No video found on this page.' };
    await video.requestPictureInPicture();
    return { ok: true, active: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
})()`;

/** Runs in the page. Pauses playing media, or resumes the first media element. */
export const TOGGLE_MEDIA_PLAYBACK_SCRIPT = `(async () => {
  try {
    const media = Array.from(document.querySelectorAll('video,audio'));
    const current = media.find((item) => !item.paused) || media[0];
    if (!current) return { ok: false, error: 'No media found on this page.' };
    if (current.paused) {
      await current.play();
      return { ok: true, playing: true };
    }
    current.pause();
    return { ok: true, playing: false };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
})()`;
