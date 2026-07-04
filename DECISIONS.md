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

- **Production email provider: Resend**, chosen but not yet configured. Blocked on owning a domain to send from -- Supabase's default auth-email sender works for dev (rate-limited, fine at low volume) but isn't meant for real signup traffic, and sending from a generic/shared address isn't a good look for real users either. Revisit once a domain exists; configure Resend + your domain in Supabase Auth settings, then also flip on "Confirm email" for the production project (deliberately off in dev since the rate-limited default sender made iteration painful -- this is the point where it stops being a cost and starts being free).
- **Separate production Supabase project deferred.** Not worth the split (and possible plan/cost implications) until closer to actually inviting the 20-50 people from the MVP success criteria. `supabase/migrations/` is already initialized with the current schema as a baseline (Phase 9), so creating the prod project and applying migrations to it later is a mechanical step, not a redesign.
- **Carried forward, still blocked:** the Phase 1 forgot-password flow's full click-through (request email -> click link -> land on reset form -> set new password) was never confirmed end-to-end -- the one attempt landed on the login screen instead, likely Stanford Gmail's link-prescanning consuming the one-time token before the real click. Retesting this needs a real (non-rate-limited) email provider live, so it's blocked on the same domain/Resend setup above.

## Technical scope

- **No barcode/camera scanning yet.** `Scan.jsx` stays a stub with a manual "Add a product" fallback. Barcode is core to this category eventually, but building real camera + external-API integration before the core rating loop even works would be backwards.
- **No Expo/React Native migration.** Stays a Vite + React web app. Mobile is a real future step, not a current one.
- **No push notifications, Redis, or read replicas.** All scale/infra concerns that don't apply at 20-50 users.
- **TypeScript migration deferred**, not rejected. Staying in `.jsx` with JSDoc typedefs for now; revisit after the MVP ships rather than re-touching every file mid-build.
