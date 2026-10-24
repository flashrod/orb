import { ORB_EVENT_CHANNELS } from '../../shared/events';

/**
 * The subset of the preload bridge this module needs. Kept structural so the
 * adapter can be tested without Electron.
 */
export type OrbEventBridge = {
  on: (channel: string, listener: (payload: unknown) => void) => number;
  off: (subscriptionId: number) => void;
};

export type OrbEventTarget = {
  dispatchEvent: (event: Event) => boolean;
};

/**
 * Re-emits main-process push events as DOM CustomEvents on the shell window.
 *
 * The app shell already listens for `orb:*` CustomEvents, so this keeps one
 * subscription point for IPC and avoids every component talking to preload.
 * Returns an unsubscribe function.
 */
export function bindMainEvents(
  bridge: OrbEventBridge | undefined | null,
  target: OrbEventTarget,
): () => void {
  if (!bridge) return () => {};

  const subscriptionIds = ORB_EVENT_CHANNELS.map((channel) =>
    bridge.on(channel, (payload) => {
      target.dispatchEvent(new CustomEvent(channel, { detail: payload }));
    }),
  );

  return () => {
    for (const id of subscriptionIds) bridge.off(id);
  };
}
