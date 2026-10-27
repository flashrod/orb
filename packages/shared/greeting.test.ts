import { describe, expect, it } from 'vitest';
import { greetingForHour, personalizedGreeting } from './greeting';

describe('day greeting', () => {
  it('changes at noon and again at six', () => {
    expect(greetingForHour(0)).toBe('Good morning');
    expect(greetingForHour(11)).toBe('Good morning');
    expect(greetingForHour(12)).toBe('Good afternoon');
    expect(greetingForHour(17)).toBe('Good afternoon');
    expect(greetingForHour(18)).toBe('Good evening');
    expect(greetingForHour(23)).toBe('Good evening');
  });

  it('normalizes odd hours instead of returning undefined', () => {
    expect(greetingForHour(-1)).toBe('Good evening');
    expect(greetingForHour(25)).toBe('Good morning');
    expect(greetingForHour(Number.NaN)).toBe('Good morning');
  });

  it('adds a name only when there is one', () => {
    expect(personalizedGreeting(9)).toBe('Good morning');
    expect(personalizedGreeting(9, '  Dylan ')).toBe('Good morning, Dylan');
    expect(personalizedGreeting(14, '')).toBe('Good afternoon');
  });
});
