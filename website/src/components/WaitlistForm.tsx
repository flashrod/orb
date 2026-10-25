'use client';

import { useId, useRef, useState } from 'react';
import { CheckCircle } from '@phosphor-icons/react';
import { normalizeWaitlistEmail } from '@/lib/waitlist';

type Status = 'idle' | 'sending' | 'success' | 'error';

export default function WaitlistForm({ className = '' }: { className?: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalized = normalizeWaitlistEmail(email);
    if (!normalized) {
      setStatus('error');
      setError('Enter a valid email address.');
      inputRef.current?.focus();
      return;
    }

    setStatus('sending');
    setError('');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setStatus('error');
        setError(data?.error || 'The waitlist could not save your address. Try again.');
        return;
      }

      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
      setError('Could not reach the waitlist. Check your connection and try again.');
    }
  };

  if (status === 'success') {
    return (
      <div
        role="status"
        className={`rounded-2xl border border-line bg-surface p-6 text-left ${className}`}
      >
        <CheckCircle className="h-6 w-6 text-accent" weight="fill" aria-hidden="true" />
        <p className="mt-3 text-lg font-semibold text-ink">You are on the list.</p>
        <p className="mt-2 text-sm text-muted">
          We will send one email when the macOS beta opens.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@example.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status === 'error') {
              setStatus('idle');
              setError('');
            }
          }}
          aria-invalid={status === 'error'}
          aria-describedby={status === 'error' ? errorId : hintId}
          className="h-12 w-full min-w-0 rounded-full border border-line bg-elevated px-4 py-2 text-base text-ink placeholder:text-muted/70 transition-colors duration-700 ease-fluid focus:border-accent sm:flex-1"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          aria-busy={status === 'sending'}
          className="h-12 shrink-0 rounded-full bg-ink px-3 py-2 text-base font-semibold text-white transition-all duration-700 ease-fluid hover:bg-accent active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'sending' ? 'Joining…' : 'Join the beta'}
        </button>
      </form>

      {status === 'error' ? (
        <p id={errorId} role="alert" className="mt-3 text-sm text-accent-strong">
          {error}
        </p>
      ) : (
        <p id={hintId} className="mt-3 text-xs text-muted">
          One email when your invite is ready. No account. No card.
        </p>
      )}
    </div>
  );
}
