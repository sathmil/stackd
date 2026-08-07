# Architecture

Reference doc, not a phase deliverable — see `.claude/plans/velvety-enchanting-dewdrop.md` for the actual build sequence.

## System diagram

```
        React (Vite) + React Router (from Phase 1.5)
                       │
              components/ + pages/
                       │
             hooks/ (useAsync, etc.)
                       │
         lib/api/*  ← only this layer talks to Supabase
                       │
             lib/supabaseClient.js
                       │
        ┌──────────────┼───────────────┐
        │              │               │
  Supabase Auth   Postgres (RLS +   Supabase Storage
        │         SQL views)            │
        │              │               │
        └──────┬───────┴───────┬───────┘
               │
        Edge Functions (service role, Phase 8)
               │
          LLM API (ingredient analysis)
```

**Hard rule:** components and pages never call `supabase` directly — only files under `src/lib/api/` do. This keeps the data-fetching layer swappable (caching, React Query, etc.) without touching every page.

## Data model (ER)

```
auth.users ──1:1── profiles
                        │ user_id
                        ▼
brands ──1:N── products ──1:N── product_variants ──1:N── reviews ──N:M── tags
                                        │                     │
                                        │                     └── review_reports
                                        └──1:N── list_items ──N:1── lists ──N:1── profiles
```

Products are a parent + variant model: a product (e.g. "Celsius") has one row per flavor/size (e.g. "Celsius – Sparkling Orange"), because the variant is what's actually rated, reviewed, and listed — flavor changes the real experience being judged.

## Source of truth

One authoritative place per concern:

| Concern                 | Source of truth                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Auth/session            | Supabase Auth (`auth.users`)                                                                                           |
| User profile            | `profiles`                                                                                                             |
| Catalog                 | `products` / `product_variants`                                                                                        |
| User ratings            | `reviews` (`taste_rating`, `value_effectiveness_rating` only)                                                          |
| Ingredient quality      | AI — written only by the Phase 8 Edge Function via the service role, never the client (enforced by a Postgres trigger) |
| Aggregate/overall score | `variant_rating_summary` SQL view — never recomputed ad hoc in JS                                                      |
| Lists                   | `lists` / `list_items`                                                                                                 |
| Moderation status       | `status` columns, changed only via Supabase Studio                                                                     |
| Kill-switches           | `feature_flags`                                                                                                        |

## Auth flow

1. `supabase.auth.signUp` / `signInWithPassword` from `Auth.jsx`.
2. A Postgres trigger (`handle_new_user`) auto-creates a `profiles` row on signup.
3. `App.jsx` holds no auth logic of its own — it subscribes to `supabase.auth.onAuthStateChange` and renders based on session state (`undefined` = loading, `null` = logged out, a session = logged in). Password recovery is handled via the same listener catching a `PASSWORD_RECOVERY` event, not a separate flow.
4. Every subsequent request carries the user's JWT; Postgres Row Level Security (RLS) — not application code — is what actually restricts which rows any given request can see or touch. Table-level `GRANT`s are a separate, required layer underneath RLS (see `DECISIONS.md`/Phase 0 for why both are needed).

## Request flow (typical read)

```
Page component
  → src/lib/api/products.js (fetchApprovedVariants, etc.)
    → supabase.from('product_variants').select(...)
      → Postgres (RLS applied per the requesting user's JWT)
    ← rows
  ← rendered via src/hooks/useAsync.js's { data, loading, error, refetch }
```

## Why Supabase over rolling a custom backend

Postgres + Auth + Storage + Row Level Security + auto-generated REST (PostgREST) as one hosted service means the entire access-control model lives in the database (RLS policies), not scattered across API route handlers — for a solo project, that's one less layer to keep in sync. Edge Functions (Deno) cover the handful of cases that genuinely need a trusted server (calling an LLM with a secret key, writing fields the client must never set directly).
