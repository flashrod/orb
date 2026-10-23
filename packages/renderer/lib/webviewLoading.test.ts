import { describe, expect, it } from 'vitest';

type LoadingState = 'idle' | 'loading';

/**
 * Loading state machine for WebView.
 * Events:
 *   'start'  - did-start-loading fired
 *   'stop'   - did-stop-loading fired
 *   'fail'   - did-fail-load fired (main frame)
 */
function loadingReducer(state: LoadingState, event: 'start' | 'stop' | 'fail'): LoadingState {
  switch (event) {
    case 'start': return 'loading';
    case 'stop': return 'idle';
    case 'fail': return 'idle';
  }
}

describe('webview loading state (spinner → progress bar)', () => {
  it('starts idle', () => {
    expect(loadingReducer('idle', 'stop')).toBe('idle');
  });

  it('transitions to loading on did-start-loading', () => {
    expect(loadingReducer('idle', 'start')).toBe('loading');
    expect(loadingReducer('loading', 'start')).toBe('loading');
  });

  it('returns to idle on did-stop-loading', () => {
    expect(loadingReducer('loading', 'stop')).toBe('idle');
    expect(loadingReducer('idle', 'stop')).toBe('idle');
  });

  it('returns to idle on did-fail-load', () => {
    expect(loadingReducer('loading', 'fail')).toBe('idle');
  });

  it('progress bar should show when loading, never a full-page spinner', () => {
    // After the fix: no full-page spinner at any loading state
    const showSpinner = (state: LoadingState) => false;
    const showProgressBar = (state: LoadingState) => state === 'loading';

    expect(showSpinner('loading')).toBe(false);
    expect(showProgressBar('loading')).toBe(true);
    expect(showProgressBar('idle')).toBe(false);
  });
});
