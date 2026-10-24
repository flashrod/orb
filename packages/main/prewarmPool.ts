export interface Prewarmable {
  destroy(): void;
}

export type PrewarmSchedule = (task: () => void) => void;

/**
 * Keeps hidden, ready-to-use views per profile so a new tab can claim one
 * instead of paying view and session setup on Cmd+T.
 *
 * The pool is deliberately Electron-free: the host supplies a factory and a
 * scheduler, and tests can use a synchronous scheduler to observe refills.
 */
export class PrewarmPool<T extends Prewarmable> {
  private readonly ready = new Map<string, T[]>();
  private readonly perProfile: number;
  private readonly schedule: PrewarmSchedule;
  private destroyed = false;

  constructor(
    private readonly create: (profileId: string) => T,
    options: { perProfile?: number; schedule?: PrewarmSchedule } = {},
  ) {
    this.perProfile = Math.max(1, options.perProfile ?? 1);
    this.schedule = options.schedule ?? ((task) => setImmediate(task));
  }

  /** Number of ready views, across profiles. Used by diagnostics and tests. */
  get size(): number {
    let total = 0;
    for (const list of this.ready.values()) total += list.length;
    return total;
  }

  /** Fills a profile's spare views. Idempotent; safe to call often. */
  warm(profileId: string): void {
    if (this.destroyed) return;
    const list = this.ready.get(profileId) ?? [];
    this.ready.set(profileId, list);
    while (list.length < this.perProfile) list.push(this.create(profileId));
  }

  /**
   * Claims a ready view, then schedules a replacement so the next tab is
   * instant without blocking this one.
   */
  take(profileId: string): T | undefined {
    if (this.destroyed) return undefined;
    const list = this.ready.get(profileId);
    const view = list?.shift();
    if (!view) return undefined;
    this.schedule(() => this.warm(profileId));
    return view;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const list of this.ready.values()) {
      for (const view of list) view.destroy();
    }
    this.ready.clear();
  }
}
