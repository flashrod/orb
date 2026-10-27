import { describe, expect, it } from 'vitest';
import {
  isNeverHibernate,
  normalizeNeverHibernateEntry,
  pipPolicyFor,
  tidyTitle,
} from './siteBehavior';

describe('per-site behavior: never-hibernate list', () => {
  it('matches a bare domain and its subdomains', () => {
    const list = ['example.com'];
    expect(isNeverHibernate('https://example.com/page', list)).toBe(true);
    expect(isNeverHibernate('https://app.example.com/page', list)).toBe(true);
    expect(isNeverHibernate('https://notexample.com/', list)).toBe(false);
  });

  it('accepts pasted URLs and ignores paths', () => {
    const entry = normalizeNeverHibernateEntry('https://mail.example.com/inbox?x=1');
    expect(entry).toBe('mail.example.com');
    expect(isNeverHibernate('https://mail.example.com/other', [entry!])).toBe(true);
    expect(isNeverHibernate('https://example.com/', [entry!])).toBe(false);
  });

  it('normalizes www and casing', () => {
    expect(normalizeNeverHibernateEntry('WWW.Example.COM')).toBe('example.com');
    expect(isNeverHibernate('https://example.com/', ['WWW.Example.COM'])).toBe(true);
  });

  it('rejects junk entries', () => {
    expect(normalizeNeverHibernateEntry('')).toBeNull();
    expect(normalizeNeverHibernateEntry('   ')).toBeNull();
    expect(normalizeNeverHibernateEntry('javascript:alert(1)')).toBeNull();
    expect(isNeverHibernate('about:blank', ['example.com'])).toBe(false);
    expect(isNeverHibernate('not a url', ['example.com'])).toBe(false);
  });

  it('does not protect anything by default', () => {
    expect(isNeverHibernate('https://facebook.com/', [])).toBe(false);
    expect(isNeverHibernate('https://x.com/', [])).toBe(false);
  });
});

describe('per-site behavior: picture-in-picture policy', () => {
  it('does not auto-enter PiP for call apps', () => {
    expect(pipPolicyFor('https://app.slack.com/client/T1').autoEnter).toBe(false);
    expect(pipPolicyFor('https://meet.google.com/abc-defg-hij').autoEnter).toBe(false);
    expect(pipPolicyFor('https://teams.microsoft.com/l/meetup-join/1').autoEnter).toBe(false);
  });

  it('allows PiP by default', () => {
    const policy = pipPolicyFor('https://example.com/video');
    expect(policy.autoEnter).toBe(true);
    expect(policy.activatesWhenInaudible).toBe(false);
    expect(policy.disabledControls).toEqual([]);
  });

  it('applies per-site controls', () => {
    expect(pipPolicyFor('https://www.twitch.tv/channel').disabledControls).toEqual(['play', 'scrub', 'skip']);
    expect(pipPolicyFor('https://www.youtube.com/watch?v=1')).toMatchObject({ autoEnter: true, activatesWhenInaudible: true });
    expect(pipPolicyFor('https://open.spotify.com/playlist/1').disabledControls).toEqual(['skip', 'scrub']);
    expect(pipPolicyFor('https://www.netflix.com/watch/1').disabledControls).toEqual(['skip', 'scrub']);
  });

  it('can both disable auto-PiP and configure controls', () => {
    const policy = pipPolicyFor('https://meet.google.com/abc-defg-hij');
    expect(policy.autoEnter).toBe(false);
    expect(policy.disabledControls).toEqual(['close']);
  });
});

describe('per-site behavior: tidy titles', () => {
  it('uses Gmail route labels instead of the inbox count', () => {
    expect(tidyTitle('https://mail.google.com/mail/u/0/#inbox', 'Inbox (12) - ada@example.com - Gmail')).toBe('Gmail');
    expect(tidyTitle('https://mail.google.com/mail/u/0/#starred', 'Starred - ada@example.com - Gmail')).toBe('Starred');
    expect(tidyTitle('https://mail.google.com/mail/u/0/#snoozed', 'Snoozed - ada@example.com - Gmail')).toBe('Snoozed');
  });

  it('strips the Gmail account suffix from message titles', () => {
    expect(tidyTitle('https://mail.google.com/mail/u/0/#search/from%3Aalice', 'from:alice - ada@example.com - Gmail')).toBe('from:alice');
  });

  it('maps Google Calendar routes', () => {
    expect(tidyTitle('https://calendar.google.com/calendar/u/0/r/week', 'Week of October 25 - Google Calendar')).toBe('Calendar');
    expect(tidyTitle('https://calendar.google.com/calendar/u/0/r/agenda', 'Agenda - Google Calendar')).toBe('Schedule');
  });

  it('strips a trailing site name derived from the host', () => {
    expect(tidyTitle('https://www.youtube.com/watch?v=1', 'Never Gonna Give You Up - YouTube')).toBe('Never Gonna Give You Up');
    expect(tidyTitle('https://en.wikipedia.org/wiki/Electron', 'Electron (software) - Wikipedia')).toBe('Electron (software)');
    expect(tidyTitle('https://www.netflix.com/watch/1', 'Stranger Things - Netflix')).toBe('Stranger Things');
    expect(tidyTitle('https://web.whatsapp.com/', 'Orb friends - WhatsApp')).toBe('Orb friends');
    expect(tidyTitle('https://www.figma.com/file/abc/Design', 'Orb Design – Figma')).toBe('Orb Design');
    expect(tidyTitle('https://open.spotify.com/playlist/1', 'Focus | Spotify')).toBe('Focus');
    expect(tidyTitle('https://docs.google.com/document/d/1', 'Roadmap - Google Docs')).toBe('Roadmap');
    expect(tidyTitle('https://www.zillow.com/homedetails/1', '123 Main St | Zillow')).toBe('123 Main St');
  });

  it('strips a leading site name derived from the host', () => {
    expect(tidyTitle('https://www.amazon.com/dp/1', 'Amazon.com: Kindle Paperwhite')).toBe('Kindle Paperwhite');
  });

  it('cleans notification counts without a site list', () => {
    expect(tidyTitle('https://www.linkedin.com/feed/', '(3) Feed | LinkedIn')).toBe('Feed');
    expect(tidyTitle('https://www.notion.so/team/roadmap', '(5) Roadmap | Notion')).toBe('Roadmap');
    expect(tidyTitle('https://example.com/', '(2) Inbox')).toBe('Inbox');
  });

  it('removes GitHub author noise', () => {
    expect(tidyTitle('https://github.com/org/repo/pull/12', 'Add support by alice · Pull Request #12 · org/repo')).toBe('Add support · Pull Request #12 · org/repo');
  });

  it('leaves a suffix that is real content alone', () => {
    expect(tidyTitle('https://news.ycombinator.com/item?id=1', 'Show HN: Orb | Hacker News')).toBe('Show HN: Orb | Hacker News');
    expect(tidyTitle('https://example.com/blog', 'How to build a browser - A guide')).toBe('How to build a browser - A guide');
    expect(tidyTitle('https://example.com/blog', 'Part one | Part two')).toBe('Part one | Part two');
  });

  it('leaves unknown sites and non-web URLs alone', () => {
    expect(tidyTitle('https://example.com', 'Example Domain')).toBe('Example Domain');
    expect(tidyTitle('about:blank', 'New Tab')).toBe('New Tab');
    expect(tidyTitle('not a url', 'Loose title')).toBe('Loose title');
  });

  it('never returns an empty title', () => {
    expect(tidyTitle('https://youtube.com/', 'YouTube')).toBe('YouTube');
    expect(tidyTitle('https://example.com/', '(4)')).toBe('(4)');
  });

  it('normalizes whitespace', () => {
    expect(tidyTitle('https://example.com', '  Hello   world  ')).toBe('Hello world');
  });
});
