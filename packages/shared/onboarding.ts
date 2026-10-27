/**
 * First-run onboarding is a four-step, keyboard-friendly conversation. The
 * pure pieces live here so the renderer only owns presentation and store side
 * effects.
 */

export const ONBOARDING_STEPS = ['hello', 'spaces', 'mood', 'ready'] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_STEP_COUNT = ONBOARDING_STEPS.length;

/** Keep a step number inside the tour, tolerating bad input from persisted or URL state. */
export function clampOnboardingStep(step: number): number {
  if (!Number.isFinite(step)) return 0;
  return Math.min(ONBOARDING_STEP_COUNT - 1, Math.max(0, Math.trunc(step)));
}

export function nextOnboardingStep(step: number): number {
  return clampOnboardingStep(step + 1);
}

export function previousOnboardingStep(step: number): number {
  return clampOnboardingStep(step - 1);
}

export function isLastOnboardingStep(step: number): boolean {
  return clampOnboardingStep(step) === ONBOARDING_STEP_COUNT - 1;
}

/**
 * A display name is a hello, not an account. Collapse whitespace, strip
 * control characters, and cap it at 24 visible characters.
 */
export function normalizeDisplayName(raw: string): string {
  const cleaned = raw.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return Array.from(cleaned).slice(0, 24).join('').trim();
}

/** The first word is enough for a greeting; full names can stay in settings. */
export function greetingName(raw: string): string {
  return normalizeDisplayName(raw).split(' ')[0] ?? '';
}

export function onboardingStepLabel(step: number): string {
  return `${String(clampOnboardingStep(step) + 1).padStart(2, '0')} / ${String(ONBOARDING_STEP_COUNT).padStart(2, '0')}`;
}
