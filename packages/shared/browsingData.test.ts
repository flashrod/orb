import { describe, expect, it } from 'vitest';
import {
  describePlan,
  planClearBrowsingData,
  planIsEmpty,
  SITE_DATA_STORAGES,
} from './browsingData';

describe('planClearBrowsingData', () => {
  it('clears nothing when nothing is selected', () => {
    const plan = planClearBrowsingData({});
    expect(plan).toEqual({ history: false, cache: false, storages: [], labels: [] });
    expect(planIsEmpty(plan)).toBe(true);
  });

  it('clears history and cache without touching storage', () => {
    const plan = planClearBrowsingData({ history: true, cache: true });
    expect(plan.history).toBe(true);
    expect(plan.cache).toBe(true);
    expect(plan.storages).toEqual([]);
    expect(plan.labels).toEqual(['browsing history', 'cached files']);
    expect(planIsEmpty(plan)).toBe(false);
  });

  it('maps cookies and site data to separate storage buckets', () => {
    expect(planClearBrowsingData({ cookies: true }).storages).toEqual(['cookies']);

    const site = planClearBrowsingData({ siteData: true });
    expect(site.storages).toEqual([...SITE_DATA_STORAGES]);
    expect(site.storages).not.toContain('cookies');
  });

  it('combines both storage choices without duplicates', () => {
    const plan = planClearBrowsingData({ cookies: true, siteData: true });
    expect(plan.storages[0]).toBe('cookies');
    expect(new Set(plan.storages).size).toBe(plan.storages.length);
    expect(plan.labels).toEqual(['cookies', 'site data']);
  });

  it('ignores truthy non-booleans and malformed payloads', () => {
    expect(planIsEmpty(planClearBrowsingData({ history: 'yes', cache: 1, cookies: 'true' }))).toBe(true);
    expect(planIsEmpty(planClearBrowsingData(null))).toBe(true);
    expect(planIsEmpty(planClearBrowsingData('history'))).toBe(true);
    expect(planIsEmpty(planClearBrowsingData([true]))).toBe(true);
  });
});

describe('describePlan', () => {
  it('reads naturally for any number of items', () => {
    expect(describePlan([])).toBe('nothing');
    expect(describePlan(['cookies'])).toBe('cookies');
    expect(describePlan(['browsing history', 'cached files'])).toBe('browsing history and cached files');
    expect(describePlan(['browsing history', 'cached files', 'cookies'])).toBe('browsing history, cached files and cookies');
  });
});
