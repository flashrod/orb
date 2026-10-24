export type WaitlistResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/** Trims and validates an address before anything is forwarded or stored. */
export function normalizeWaitlistEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

/**
 * Forwards a signup to a provider webhook. The route fails closed when the
 * webhook is missing or unreachable so the page never reports a false success.
 */
export async function forwardWaitlistSignup(
  email: string,
  options: {
    webhookUrl?: string;
    token?: string;
    fetchImpl?: typeof fetch;
    now?: () => Date;
  } = {},
): Promise<WaitlistResult> {
  const webhookUrl = options.webhookUrl?.trim();
  if (!webhookUrl) {
    return { ok: false, status: 503, error: 'The waitlist is not configured yet.' };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const submittedAt = (options.now?.() ?? new Date()).toISOString();

  try {
    const response = await fetchImpl(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: JSON.stringify({ email, source: 'orb-website', submittedAt }),
    });
    if (!response.ok) {
      return { ok: false, status: 502, error: `The waitlist provider returned ${response.status}.` };
    }
    return { ok: true };
  } catch {
    return { ok: false, status: 502, error: 'Could not reach the waitlist provider.' };
  }
}
