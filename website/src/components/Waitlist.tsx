'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Waitlist() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setStatus('success');
    } catch {
      setStatus('error');
    }
    setTimeout(() => setStatus('idle'), 4000);
  };

  return (
    <section id="waitlist" className="bg-orb-accent section-padding">
      <div className="container-max reveal text-center">
        <h2 className="text-4xl md:text-5xl font-serif font-semibold text-white mb-6">
          Join the waitlist
        </h2>
        <p className="text-white/80 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
          macOS public beta is coming soon. Enter your email and we&rsquo;ll let you know when it&rsquo;s ready.
        </p>
        <form onSubmit={handleSubmit} className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 px-5 py-3 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white text-sm"
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            className="px-8 py-3 rounded-lg bg-white text-orb-accent text-sm font-medium hover:bg-orb-surface transition-colors disabled:opacity-60"
          >
            {status === 'sending' ? 'Adding&hellip;' : 'Join waitlist'}
          </button>
        </form>
        {status === 'success' && (
          <p className="mt-4 text-sm text-white/70">Thanks&mdash;we&rsquo;ll email you when the beta opens.</p>
        )}
        {status === 'error' && (
          <p className="mt-4 text-sm text-white/70">Something went wrong. Try again.</p>
        )}
      </div>
    </section>
  );
}
