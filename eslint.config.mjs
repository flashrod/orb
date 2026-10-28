import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Deliberately narrow: the only rule enforced is rules-of-hooks. Calling a
 * hook inside a useEffect compiles, typechecks and passes tests, but throws
 * React error #321 at runtime and leaves a blank window. That shipped once;
 * this catches it before it ships again.
 *
 * Formatting and style are not enforced here — there is no formatter config.
 */
export default [
  {
    files: ['packages/**/*.{ts,tsx}'],
    ignores: ['**/*.test.ts', '**/*.test.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
    },
  },
];
