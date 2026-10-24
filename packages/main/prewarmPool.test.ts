import { describe, expect, it } from 'vitest';
import { PrewarmPool } from './prewarmPool';

class FakeView {
  destroyed = false;
  destroy() {
    this.destroyed = true;
  }
}

function setup(perProfile = 1) {
  const created: { profileId: string; view: FakeView }[] = [];
  const queue: (() => void)[] = [];
  const pool = new PrewarmPool<FakeView>(
    (profileId) => {
      const view = new FakeView();
      created.push({ profileId, view });
      return view;
    },
    { perProfile, schedule: (task) => queue.push(task) },
  );
  const flush = () => {
    while (queue.length > 0) queue.shift()!();
  };
  return { pool, created, flush };
}

describe('PrewarmPool', () => {
  it('creates spare views per profile', () => {
    const { pool, created } = setup();
    pool.warm('default');
    pool.warm('default');
    expect(pool.size).toBe(1);
    expect(created.map((entry) => entry.profileId)).toEqual(['default']);
  });

  it('claims a view and schedules a replacement', () => {
    const { pool, created, flush } = setup();
    pool.warm('default');
    const view = pool.take('default');
    expect(view).toBe(created[0].view);
    expect(pool.size).toBe(0);
    flush();
    expect(pool.size).toBe(1);
    expect(created).toHaveLength(2);
  });

  it('does not invent a view for a cold profile', () => {
    const { pool, created } = setup();
    expect(pool.take('work')).toBeUndefined();
    expect(created).toHaveLength(0);
  });

  it('keeps profiles isolated', () => {
    const { pool } = setup();
    pool.warm('default');
    pool.warm('work');
    const work = pool.take('work');
    expect(work).toBeDefined();
    expect(pool.take('default')).toBeDefined();
  });

  it('honours a larger spare count', () => {
    const { pool, created } = setup(2);
    pool.warm('default');
    expect(pool.size).toBe(2);
    expect(created).toHaveLength(2);
  });

  it('destroys spare views and stops refilling', () => {
    const { pool, created, flush } = setup();
    pool.warm('default');
    const claimed = pool.take('default');
    flush();
    const spare = created[1].view;
    pool.destroy();
    expect(spare.destroyed).toBe(true);
    expect(claimed?.destroyed).toBe(false);
    expect(pool.size).toBe(0);
    expect(pool.take('default')).toBeUndefined();
    expect(created).toHaveLength(2);
  });
});
