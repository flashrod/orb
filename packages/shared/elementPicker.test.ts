import { describe, expect, it } from 'vitest';
import { PICK_ELEMENT_SCRIPT } from './elementPicker';

describe('element picker script', () => {
  it('ranks candidates and exposes widen/narrow controls', () => {
    expect(PICK_ELEMENT_SCRIPT).toContain('classScore');
    expect(PICK_ELEMENT_SCRIPT).toContain('candidates');
    expect(PICK_ELEMENT_SCRIPT).toContain('Widen');
    expect(PICK_ELEMENT_SCRIPT).toContain('Narrow');
    expect(PICK_ELEMENT_SCRIPT).toContain('Next match');
  });

  it('penalizes generated class names', () => {
    expect(PICK_ELEMENT_SCRIPT).toContain('sc|jsx|emotion|styled|chakra');
    expect(PICK_ELEMENT_SCRIPT).toContain('cookie|consent|banner');
  });
});
