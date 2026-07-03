import { createClient } from '@supabase/supabase-js'

// PKCE flow, not the default implicit flow: with the implicit flow, a
// password-recovery email link points directly at Supabase's own
// token-consuming verify endpoint, so any email security gateway that
// pre-scans links (e.g. Stanford's Proofpoint URL Defense, which rewrites
// links to urldefense.com and fetches the destination automatically)
// silently burns the one-time token before the real user ever clicks --
// they land back on a plain login screen with no explanation. With PKCE,
// the email link points at *this app* with an opaque code that's only
// exchanged for a session when our own JS runs client-side, which a
// scanner doing a plain HTTP fetch never triggers.
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: { flowType: 'pkce' },
})
