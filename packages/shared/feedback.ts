/**
 * One place to send alpha feedback, with the details already filled in.
 *
 * Testers will not open a terminal to find their Electron version, and a bug
 * report that says "it broke" costs a round trip. So the button opens a GitHub
 * issue whose body already contains the environment block; the tester only adds
 * what they were doing.
 *
 * Nothing is submitted from Orb itself: the URL opens in the default browser,
 * where the tester can read, edit, or close the tab.
 */

import { formatDiagnostics, type BuildInfo } from './diagnostics';

export const FEEDBACK_REPO = 'flashrod/orb';
export const FEEDBACK_ISSUE_BASE = `https://github.com/${FEEDBACK_REPO}/issues/new`;

/** GitHub rejects very long URLs; keep well inside the usual 8 KB limit. */
export const FEEDBACK_BODY_LIMIT = 4000;

/**
 * The main process refuses external opens beyond this length, and browsers get
 * unhappy long before that. If a report blows past it, the stack is dropped and
 * the tester can still paste it with Copy details.
 */
export const FEEDBACK_URL_LIMIT = 12_000;

const BODY_TEMPLATE = [
  '### What happened',
  '',
  '',
  '### What you expected',
  '',
  '',
  '### Steps to reproduce',
  '',
  '1. ',
  '2. ',
  '',
  '---',
  '',
];

export interface FeedbackDetails {
  /** Replaces the default title. Kept short: GitHub truncates long ones. */
  title?: string;
  /** Extra markdown placed above the environment block (a stack trace, say). */
  details?: string;
}

function clamp(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit)}\n… truncated` : text;
}

/**
 * Builds the prefilled "new issue" URL.
 *
 * The diagnostics block is appended last so it is easy to delete if a tester
 * would rather not share it. Oversized sections are truncated instead of
 * producing a URL GitHub refuses.
 */
export function feedbackIssueUrl(build: BuildInfo, userAgent: string, extra: FeedbackDetails = {}): string {
  const diagnostics = clamp(formatDiagnostics(build, userAgent), FEEDBACK_BODY_LIMIT);
  const details = extra.details ? `${clamp(extra.details.trim(), FEEDBACK_BODY_LIMIT)}\n\n---\n\n` : '';
  const title = extra.title?.trim() || 'Alpha feedback';
  const body = `${BODY_TEMPLATE.join('\n')}\n${details}${diagnostics}\n`;
  const full = `${FEEDBACK_ISSUE_BASE}?${new URLSearchParams({ title, body }).toString()}`;
  if (full.length <= FEEDBACK_URL_LIMIT) return full;

  // Too long to open: keep the prompts and a short environment block, drop the
  // details. The tester can still paste the full report with Copy details.
  const lean = `${BODY_TEMPLATE.join('\n')}\n${clamp(formatDiagnostics(build, userAgent), 600)}\n`;
  return `${FEEDBACK_ISSUE_BASE}?${new URLSearchParams({ title, body: lean }).toString()}`;
}
