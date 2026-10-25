import { describe, expect, it } from 'vitest';
import {
  isKeepalive,
  isSuspensionExempt,
  pipPolicyFor,
  tidyTitle,
} from './siteBehavior';

describe('per-site behavior: keepalive', () => {
  it('keeps mail and calendar tabs alive', () => {
    expect(isKeepalive('https://mail.google.com/mail/u/0/#inbox')).toBe(true);
    expect(isKeepalive('https://calendar.google.com/calendar/u/0/r/week')).toBe(true);
    expect(isKeepalive('https://outlook.live.com/mail/0/')).toBe(true);
  });

  it('keeps real-time workspaces alive', () => {
    expect(isKeepalive('https://www.notion.so/team/page')).toBe(true);
    expect(isKeepalive('https://app.notion.com/space')).toBe(true);
    expect(isKeepalive('https://app.slack.com/client/T1/C2')).toBe(true);
    expect(isKeepalive('https://linear.app/orb/issue/1')).toBe(true);
    expect(isKeepalive('https://sentry.io/organizations/orb/issues/')).toBe(true);
  });

  it('keeps media and cloud consoles alive', () => {
    expect(isKeepalive('https://open.spotify.com/playlist/1')).toBe(true);
    expect(isKeepalive('https://console.aws.amazon.com/console/home')).toBe(true);
    expect(isKeepalive('https://www.dropbox.com/home')).toBe(true);
  });

  it('only keeps Figma files and Google editors alive', () => {
    expect(isKeepalive('https://www.figma.com/file/abc/Design')).toBe(true);
    expect(isKeepalive('https://www.figma.com/')).toBe(false);
    expect(isKeepalive('https://docs.google.com/document/d/1')).toBe(true);
    expect(isKeepalive('https://docs.google.com/spreadsheets/d/1')).toBe(true);
    expect(isKeepalive('https://docs.google.com/')).toBe(false);
  });

  it('does not protect ordinary sites', () => {
    expect(isKeepalive('https://example.com')).toBe(false);
    expect(isKeepalive('https://slack.com/')).toBe(false);
    expect(isKeepalive('not a url')).toBe(false);
    expect(isKeepalive('about:blank')).toBe(false);
  });
});

describe('per-site behavior: suspension exemptions', () => {
  it('never suspends Notion workspaces', () => {
    expect(isSuspensionExempt('https://www.notion.so/team/page')).toBe(true);
    expect(isSuspensionExempt('https://app.notion.com/space')).toBe(true);
  });

  it('does not exempt other sites', () => {
    expect(isSuspensionExempt('https://example.com')).toBe(false);
    expect(isSuspensionExempt('https://notion.com')).toBe(false);
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

  it('strips common site suffixes', () => {
    expect(tidyTitle('https://www.youtube.com/watch?v=1', 'Never Gonna Give You Up - YouTube')).toBe('Never Gonna Give You Up');
    expect(tidyTitle('https://news.ycombinator.com/item?id=1', 'Show HN: Orb | Hacker News')).toBe('Show HN: Orb');
    expect(tidyTitle('https://en.wikipedia.org/wiki/Electron', 'Electron (software) - Wikipedia')).toBe('Electron (software)');
    expect(tidyTitle('https://www.netflix.com/watch/1', 'Stranger Things - Netflix')).toBe('Stranger Things');
    expect(tidyTitle('https://web.whatsapp.com/', 'Orb friends - WhatsApp')).toBe('Orb friends');
  });

  it('cleans notification counts from social and workspace tabs', () => {
    expect(tidyTitle('https://www.linkedin.com/feed/', '(3) Feed | LinkedIn')).toBe('Feed');
    expect(tidyTitle('https://www.notion.so/team/roadmap', '(5) Roadmap | Notion')).toBe('Roadmap');
  });

  it('removes Amazon prefixes and GitHub author noise', () => {
    expect(tidyTitle('https://www.amazon.com/dp/1', 'Amazon.com: Kindle Paperwhite')).toBe('Kindle Paperwhite');
    expect(tidyTitle('https://github.com/org/repo/pull/12', 'Add support by alice · Pull Request #12 · org/repo')).toBe('Add support · Pull Request #12 · org/repo');
  });

  it('leaves unknown sites and non-web URLs alone', () => {
    expect(tidyTitle('https://example.com', 'Example Domain')).toBe('Example Domain');
    expect(tidyTitle('about:blank', 'New Tab')).toBe('New Tab');
    expect(tidyTitle('not a url', 'Loose title')).toBe('Loose title');
  });

  it('normalizes whitespace', () => {
    expect(tidyTitle('https://example.com', '  Hello   world  ')).toBe('Hello world');
  });
});
