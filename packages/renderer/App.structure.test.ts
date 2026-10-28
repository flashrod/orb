import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');

/**
 * React hooks must run during render, at the top level of the component.
 * Calling one inside a `useEffect` body compiles fine and passes typecheck,
 * but throws "Invalid hook call" (React error #321) at runtime and leaves a
 * blank window. This happened once with the shortcut handlers; guard it.
 *
 * Hooks nested in a component are indented four or more spaces. Every hook in
 * App.tsx belongs at the component's two-space level.
 */
describe('App.tsx structure', () => {
  it('never calls hooks from a nested block', () => {
    const offenders = source
      .split('\n')
      .map((line, index) => ({ line, number: index + 1 }))
      .filter(({ line }) =>
        /^ {4,}(?:const\s+)?\w+\s*=\s*use(State|Effect|Ref|Callback|Memo|Reducer|Context)\s*[<(]/.test(line),
      );

    expect(offenders).toEqual([]);
  });
});
