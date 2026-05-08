# Security Notes — ATP App

## Public-by-design keys

The following keys appear in `app.json` and are public by design:

- `supabaseUrl` — public Supabase project endpoint
- `supabaseAnonKey` — JWT with `role: anon`, designed for client-side use
- `eas.projectId` — public EAS identifier

These are NOT secrets. Row Level Security (RLS) on all Supabase tables is the
authorization boundary. The anon key without RLS would be a problem; with RLS
it is the standard architecture for Supabase apps.

## Server-side secrets

All sensitive keys live in environment variables on Supabase Edge Functions:

- `ANTHROPIC_API_KEY` — used by `anthropic-proxy` Edge Function
- (future) `OPENAI_API_KEY` — fallback provider
- (future) `STRIPE_SECRET_KEY` — payment processing
- (future) `CONEKTA_PRIVATE_KEY` — payment processing MX

These are managed via `supabase secrets set ...` and never appear in client
code, app.json, or git history.

## RLS as authorization boundary

Every table created in `supabase/migrations/` has Row Level Security enabled
with policies that scope reads/writes to `auth.uid()`. Migration
`038_security_hardening.sql` retroactively applies RLS to legacy tables.

## Admin UID in client (UX-only)

The constant `ADMIN_UID = '90a55e74-...'` appears in two client files
(`app/feedback-dashboard.tsx`, `app/(tabs)/yo.tsx`). This is used ONLY to
hide/show admin-only UI elements. Authorization is enforced server-side by
RLS policies that reference the same UID. A non-admin who manipulates the
client cannot access admin data.

## Audit history

- 2026-05-XX — Internal audit (read-only) by Cowork advisor. Result:
  no critical secrets exposed. Three P1/P2 improvements identified
  and (if applied) referenced in CC_PROMPT_002.

## Reporting security issues

Email security@atp.app (placeholder until domain set up).
