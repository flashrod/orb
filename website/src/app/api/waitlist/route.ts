import { NextResponse } from 'next/server';
import { forwardWaitlistSignup, normalizeWaitlistEmail } from '@/lib/waitlist';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let email: string | null = null;
  try {
    const body = await req.json();
    email = normalizeWaitlistEmail(body?.email);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const webhookUrl = process.env.WAITLIST_WEBHOOK_URL;
  if (!webhookUrl && process.env.NODE_ENV !== 'production') {
    // Local development should work before a provider is chosen.
    console.log('Waitlist signup (development, no webhook):', email);
    return NextResponse.json({ ok: true });
  }

  const result = await forwardWaitlistSignup(email, {
    webhookUrl,
    token: process.env.WAITLIST_WEBHOOK_TOKEN,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
