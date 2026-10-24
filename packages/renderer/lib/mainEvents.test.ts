import { describe, expect, it, vi } from 'vitest';
import { bindMainEvents, type OrbEventBridge, type OrbEventTarget } from './mainEvents';
import { ORB_EVENT_CHANNELS } from '../../shared/events';

function createBridge() {
  const listeners = new Map<number, { channel: string; listener: (payload: unknown) => void }>();
  let nextId = 1;
  const bridge: OrbEventBridge = {
    on: vi.fn((channel: string, listener: (payload: unknown) => void) => {
      const id = nextId++;
      listeners.set(id, { channel, listener });
      return id;
    }),
    off: vi.fn((id: number) => {
      listeners.delete(id);
    }),
  };
  return { bridge, listeners };
}

function createTarget() {
  const events: Event[] = [];
  const target: OrbEventTarget = {
    dispatchEvent: (event: Event) => {
      events.push(event);
      return true;
    },
  };
  return { target, events };
}

describe('main -> renderer event bridge', () => {
  it('subscribes to every known channel exactly once', () => {
    const { bridge } = createBridge();
    const { target } = createTarget();

    bindMainEvents(bridge, target);

    expect(bridge.on).toHaveBeenCalledTimes(ORB_EVENT_CHANNELS.length);
    const subscribed = (bridge.on as ReturnType<typeof vi.fn>).mock.calls.map((call) => call[0]);
    expect(subscribed).toEqual([...ORB_EVENT_CHANNELS]);
  });

  it('re-emits IPC payloads as orb:* CustomEvents', () => {
    const { bridge, listeners } = createBridge();
    const { target, events } = createTarget();

    bindMainEvents(bridge, target);

    const permission = { id: 'p1', host: 'meet.google.com', permission: 'camera' };
    const permissionListener = [...listeners.values()].find((entry) => entry.channel === 'orb:permission-request');
    permissionListener?.listener(permission);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('orb:permission-request');
    expect((events[0] as CustomEvent).detail).toEqual(permission);

    const download = { id: 'd1', state: 'progressing', receivedBytes: 10 };
    const downloadListener = [...listeners.values()].find((entry) => entry.channel === 'orb:download-updated');
    downloadListener?.listener(download);

    expect((events[1] as CustomEvent).detail).toEqual(download);
  });

  it('unsubscribes from every channel on teardown', () => {
    const { bridge, listeners } = createBridge();
    const { target } = createTarget();

    const dispose = bindMainEvents(bridge, target);
    expect(listeners.size).toBe(ORB_EVENT_CHANNELS.length);

    dispose();

    expect(bridge.off).toHaveBeenCalledTimes(ORB_EVENT_CHANNELS.length);
    expect(listeners.size).toBe(0);
  });

  it('is a no-op when the bridge is missing', () => {
    const { target, events } = createTarget();
    expect(() => bindMainEvents(undefined, target)()).not.toThrow();
    expect(events).toHaveLength(0);
  });
});
