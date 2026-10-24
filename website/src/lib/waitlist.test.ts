import { describe, expect, it, vi } from 'vitest';
import { forwardWaitlistSignup, normalizeWaitlistEmail } from './waitlist';

describe('normalizeWaitlistEmail', () => {
  it('trims and lowercases a valid address', () => {
    expect(normalizeWaitlistEmail('  Person@Example.COM ')).toBe('person@example.com');
  });

  it('rejects missing, malformed and oversized input', () => {
    expect(normalizeWaitlistEmail(undefined)).toBeNull();
    expect(normalizeWaitlistEmail('not-an-email')).toBeNull();
    expect(normalizeWaitlistEmail('a@b')).toBeNull();
    expect(normalizeWaitlistEmail(`${'a'.repeat(250)}@example.com`)).toBeNull();
  });
});

describe('forwardWaitlistSignup', () => {
  it('posts the address and metadata to the webhook', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    const result = await forwardWaitlistSignup('person@example.com', {
      webhookUrl: 'https://hooks.example/waitlist',
      token: 'secret',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: () => new Date('2026-10-24T10:00:00.000Z'),
    });
    expect(result).toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://hooks.example/waitlist');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer secret' });
    expect(JSON.parse(String(init.body))).toEqual({
      email: 'person@example.com',
      source: 'orb-website',
      submittedAt: '2026-10-24T10:00:00.000Z',
    });
  });

  it('fails closed when no webhook is configured', async () => {
    await expect(forwardWaitlistSignup('person@example.com')).resolves.toMatchObject({ ok: false, status: 503 });
  });

  it('reports provider errors instead of pretending success', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 500 }));
    await expect(forwardWaitlistSignup('person@example.com', {
      webhookUrl: 'https://hooks.example/waitlist',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({ ok: false, status: 502 });
  });

  it('reports network failures', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('offline'); });
    await expect(forwardWaitlistSignup('person@example.com', {
      webhookUrl: 'https://hooks.example/waitlist',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({ ok: false, status: 502 });
  });
});
