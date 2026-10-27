import { describe, expect, it } from 'vitest';
import {
  ONBOARDING_STEP_COUNT,
  clampOnboardingStep,
  greetingName,
  isLastOnboardingStep,
  nextOnboardingStep,
  normalizeDisplayName,
  onboardingStepLabel,
  previousOnboardingStep,
} from './onboarding';

describe('onboarding steps', () => {
  it('starts and ends inside the tour', () => {
    expect(clampOnboardingStep(-4)).toBe(0);
    expect(clampOnboardingStep(9)).toBe(ONBOARDING_STEP_COUNT - 1);
    expect(clampOnboardingStep(Number.NaN)).toBe(0);
    expect(previousOnboardingStep(0)).toBe(0);
    expect(nextOnboardingStep(ONBOARDING_STEP_COUNT - 1)).toBe(ONBOARDING_STEP_COUNT - 1);
    expect(isLastOnboardingStep(ONBOARDING_STEP_COUNT - 1)).toBe(true);
  });

  it('formats the step counter with two digits', () => {
    expect(onboardingStepLabel(0)).toBe('01 / 04');
    expect(onboardingStepLabel(3)).toBe('04 / 04');
  });
});

describe('onboarding display name', () => {
  it('collapses whitespace and trims the edges', () => {
    expect(normalizeDisplayName('   Dylan   Mascarenhas  ')).toBe('Dylan Mascarenhas');
  });

  it('removes control characters and caps long names', () => {
    expect(normalizeDisplayName('Dylan\n\tM')).toBe('Dylan M');
    expect(normalizeDisplayName('a'.repeat(60))).toHaveLength(24);
    expect(Array.from(normalizeDisplayName('🌿'.repeat(40)))).toHaveLength(24);
  });

  it('greets people by their first name only', () => {
    expect(greetingName('Dylan Mascarenhas')).toBe('Dylan');
    expect(greetingName('  ')).toBe('');
    expect(greetingName('🌿 Fern')).toBe('🌿');
  });
});
