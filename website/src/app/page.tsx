'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Page() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setStatus(response.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
    setTimeout(() => setStatus('idle'), 4000);
  };

  return (
    <main className="relative">
      <Navbar />
      <section className="section-padding px-6">
        <div className="container-max text-center">
          <svg width="64" height="64" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-8">
            <circle cx="14" cy="14" r="12" stroke="#0F0F0F" strokeWidth="2.5" />
            <path d="M14 8a6 6 0 1 0 0 12a6 6 0 0 0 0-12Z" stroke="#0F0F0F" strokeWidth="2.5" />
            <path d="M14 14a2.5 2.5 0 1 0 0 4a2.5 2.5 0 0 0 0-4Z" stroke="#0F0F0F" strokeWidth="1.5" />
          </svg>
          <h1 className="text-6xl md:text-8xl font-serif font-bold text-[#0F0F0F] leading-tight mb-6">
            Orb
          </h1>
          <p className="text-lg md:text-xl text-[#2A2A2A] mb-10 max-w-3xl mx-auto leading-relaxed">
            Orb is a calm browser for focus and privacy — Spaces, Boosts, real ad + tracker blocking.
            Public beta coming soon for macOS, Windows, and Linux.
          </p>
          <form onSubmit={handleSubmit} className="max-w-md mx-auto flex flex-col sm:flex-row gap-4">
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 px-6 py-4 rounded-lg border border-[#CFC7BA] bg-white text-[#0F0F0F] placeholder-[#6E6B65] focus:outline-none focus:border-[#A0522D] focus:ring-2 focus:ring-[#A0522D]/20 text-sm"
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
            <p className="mt-6 text-sm text-[#2A2A2A]">Thanks—we'll email you when the beta opens.</p>
          )}
          {status === 'error' && (
            <p className="mt-6 text-sm text-[#2A2A2A]">Something went wrong. Try again.</p>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
