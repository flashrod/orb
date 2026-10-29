import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Regression test (A6): window.prompt, window.confirm and window.alert must
 * not be used anywhere in the renderer shell — they throw in Electron and
 * were replaced by inline inputs and confirm dialogs.
 */
describe('no window.dialog APIs (A6)', () => {
  const rendererDir = 'packages/renderer';
  const files = [
    `${rendererDir}/components/BookmarksBar.tsx`,
    `${rendererDir}/components/ConfirmDialog.tsx`,
  ];

  for (const file of files) {
    it(`${file} does not use window.prompt`, () => {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/window\.prompt/);
    });

    it(`${file} does not use window.confirm`, () => {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/window\.confirm/);
    });

    it(`${file} does not use window.alert`, () => {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/window\.alert/);
    });
  }
});
