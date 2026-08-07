# Decisions

A short log of what was deliberately deferred or ruled out, and why, so it doesn't get re-litigated from scratch later. See `.claude/plans/velvety-enchanting-dewdrop.md` for the full phased build plan these decisions came out of.

## Ratings & catalog

- **Ingredient quality is AI-computed, not user-submitted.** Users rate `taste` and `value_effectiveness` (1.0-5.0 decimal). The AI reads a product's ingredient list once and produces a shared `ai_ingredient_quality_score` on the variant, not per-review. This keeps one crowd-sourced axis structured and objective rather than every user guessing at ingredient quality.
- **Products are parent + variant.** Flavor/size changes the actual product being rated (Ghost Energy Blue Raspberry vs Watermelon), so variants are the rateable/reviewable/list-able unit, not the parent product.
- **Brands are metadata-only for now** (name/logo/website/verified flag). No brand-owner login or brand dashboard -- that opens a conflict-of-interest question (can a brand rep review their own product?) that hasn't been decided, and there's no permissions system for a second account type yet.
- **No creator/influencer badge system.** Explicitly out of scope -- it's a different feature (verified-taste-tracking) from the brands decision above and wasn't asked for.

## Social & discovery

- **Aggregate-only ratings, no follow graph, for MVP.** Beli's moat is the social graph, but that's also its cold-start problem -- an app with zero value until your friends join. Stackd's MVP value has to stand on its own (real ratings, real ingredient AI analysis) before any social layer gets built on top.
- **No ML recommendations.** "You liked this, try that" needs real usage data first; premature to build against near-zero data.
- **Search uses Postgres (`pg_trgm` trigram indexes), not Algolia/Typesense.** Fine at this scale; revisit only if it's provably too slow.

## Trust & moderation

- **All moderation happens via the Supabase Studio dashboard, not an in-app admin UI.** Studio access itself is the access-control story -- only project members (you) can approve/reject/flag anything. No custom admin role needed at this scale.
- **No automated fake-review/spam detection.** A user-facing "Report" button + manual review in Studio is the only mechanism. Simple per-user daily insert caps (reviews/products/reports) guard against a single bad actor, not general abuse.
- **Duplicate products are prevented structurally** (a normalized unique index on brand+name), and near-duplicates are merged by hand with documented SQL steps (see `TRUST_AND_SAFETY.md`), not an automated merge tool.

## Production infrastructure (Phase 9)

- **Production email provider: Resend**, domain `getstackd.app` acquired and configured -- Site URL/Redirect URLs updated in Supabase Auth settings, custom Reset Password template (`supabase/templates/recovery.html`) wired in, Resend click tracking disabled. "Confirm email" still off for now (revisit once this becomes a real cost, i.e. spam signups actually start happening -- not before).
- **Separate production Supabase project deferred.** Not worth the split (and possible plan/cost implications) until closer to actually inviting the 20-50 people from the MVP success criteria. `supabase/migrations/` is already initialized with the current schema as a baseline (Phase 9), so creating the prod project and applying migrations to it later is a mechanical step, not a redesign.
- **Forgot-password full click-through: confirmed working end-to-end.** The original failure (landing on the login screen instead of the reset form) was Supabase's default email template linking directly to its own hosted verify endpoint -- a plain server-side GET that consumes the one-time token immediately, exactly what Stanford's Proofpoint URL Defense triggers by pre-scanning the link before the real click. Fixed by pointing the email template at the app's own `/reset-password` route with a `token_hash` instead, exchanged explicitly via `verifyOtp()` (gated behind a real button tap, which an automated scanner never performs) -- see `ResetPassword.jsx`'s comment for the full mechanism. Retested live: request email -> click link -> set new password -> lands in Feed, no loop, no burned token.

## Backup, rollback, kill-switch (Phase 11)

- **Point-in-time recovery/daily backups: not applicable yet.** This is a tier property of the _production_ Supabase project, which doesn't exist yet (see the deferred prod-project split above) -- nothing to confirm until that project exists. Revisit alongside creating it.
- **Vercel rollback**: already one click in the Vercel dashboard, platform-native, nothing to build.
- **`feature_flags` kill-switches verified live.** Flipped both `product_submission` and `ai_ingredient_analysis` off against the real dev project (with the user's explicit go-ahead, since it briefly affects real accounts) and confirmed each takes effect immediately with no deploy: `AddProduct.jsx` showed "Adding new products is temporarily turned off" instead of the form, and the `analyze-ingredients` Edge Function returned `{"error":"ai_ingredient_analysis is disabled"}` instead of calling OpenAI. Flipped both back on and confirmed normal behavior returned.

## Technical scope

- **No barcode/camera scanning yet.** `Scan.jsx` stays a stub with a manual "Add a product" fallback. Barcode is core to this category eventually, but building real camera + external-API integration before the core rating loop even works would be backwards.
- **No Expo/React Native migration.** Stays a Vite + React web app. Mobile is a real future step, not a current one.
- **No push notifications, Redis, or read replicas.** All scale/infra concerns that don't apply at 20-50 users.
- **TypeScript migration deferred**, not rejected. Staying in `.jsx` with JSDoc typedefs for now; revisit after the MVP ships rather than re-touching every file mid-build.
