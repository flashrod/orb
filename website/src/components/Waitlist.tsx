'use client';

import { useState } from 'react';

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
    <section id="waitlist" className="bg-orb-accent section-padding border-t border-[var(--orb-accent)]">
      <div className="container-max reveal text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white/10 text-white text-[10px] font-bold mb-8">
          <span className="w-2 h-2 rounded bg-current animate-pulse"></span>
          Limited beta spots
        </div>
        <h2 className="text-5xl md:text-7xl font-serif font-semibold text-white mb-4">
          Join the waitlist
        </h2>
        <p className="text-white/80 text-lg mb-10 max-w-3xl mx-auto leading-relaxed">
          Public beta coming soon for macOS, Windows, and Linux. Enter your email and we'll let you
          know when it's ready.
        </p>
        <form onSubmit={handleSubmit} className="max-w-md mx-auto flex flex-col sm:flex-row gap-4">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 px-6 py-4 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:border-orb-accent focus:ring-2 focus:ring-orb-accent/20 text-sm"
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            className="btn-primary"
          >
            {status === 'sending' ? 'Adding…' : 'Join waitlist'}
          </button>
        </form>
        {status === 'success' && (
          <p className="mt-6 text-sm text-orb-text">Thanks—we'll email you when the beta opens.</p>
        )}
        {status === 'error' && (
          <p className="mt-6 text-sm text-orb-text">Something went wrong. Try again.</p>
        )}
        <div className="mt-12 text-[10px] text-white/40 uppercase tracking-widest">
          Orb is open source. No tracking, no telemetry, no accounts.
        </div>
      </div>
    </section>
  );
}
