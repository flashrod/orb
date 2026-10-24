# Orb website

Next.js landing page for Orb.

```bash
npm install
npm run dev
```

## Waitlist

`POST /api/waitlist` validates the address and forwards it to
`WAITLIST_WEBHOOK_URL` as JSON:

```json
{ "email": "person@example.com", "source": "orb-website", "submittedAt": "2026-10-24T10:00:00.000Z" }
```

Set these environment variables in production:

- `WAITLIST_WEBHOOK_URL` — any endpoint that accepts a JSON POST (ConvertKit,
  Mailchimp, Zapier, a form provider, or your own function).
- `WAITLIST_WEBHOOK_TOKEN` — optional bearer token sent as
  `Authorization: Bearer …`.

Without a webhook the route returns `503` in production instead of reporting a
false success, so signups are never silently dropped. In development it logs the
address and succeeds so the form can be tested before a provider is chosen.
