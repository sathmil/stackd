# Product — user stories

Reference doc, not a phase deliverable. See `.claude/plans/velvety-enchanting-dewdrop.md` for what's actually built and when; see `DECISIONS.md` for what was deliberately left out and why.

## What Stackd is

A review app for functional food/supplement products (energy drinks, protein bars, protein powders, pre-workouts, greens powders, supplements) — "Beli/Letterboxd for what fuels you." Purely a review app: no daily-intake tracking, no health-claim engine.

## Core user loop

Discover a product → rate it → compare/rank it against others → save it to a list → come back for a better catalog/feed than last time.

## User stories

**Discovery**
- As a user, I can search the catalog by name/brand/category and sort by popularity, rating, or recency.
- As a user, I can view a product's page and see its overall score, a breakdown by taste/value/ingredient quality, its nutrition facts, and existing reviews.
- As a user, I can open a shared product link without an account and see the same information a logged-in user would.

**Reviewing**
- As a user, I can rate a product variant on taste and value/effectiveness (1.0–5.0), mark whether I'd buy it again, add a written note, and pick from a fixed set of tags.
- As a user, I can see an AI-generated ingredient-quality read for a product, distinct from my own opinion — I didn't write that score, and I can't edit it.
- As a user, I can edit or delete my own review later; I can't see or affect anyone else's.

**Comparing & saving**
- As a user, I can create a ranked list (e.g. "my pre-workout stack") and reorder items in it.
- As a user, I can make a list public and share a link to it; other people can view it without an account if it's public.

**Contributing to the catalog**
- As a user, if a product isn't in the catalog, I can add it (brand, name, flavor, nutrition facts, ingredients) — it stays pending until approved, but I can already see and rate my own submission while it's pending.
- As a user, I can report a review that seems abusive or fake.

**Account**
- As a user, I sign up with email/password, accept a disclaimer about high-caffeine content, and can reset my password if I forget it.
- As a user, I can edit my username/display name/avatar.
- As a user, I can delete my account (my personal identifiers are removed; my ratings stay in aggregate scores so I'm not skewing history for everyone else by disappearing) or export a copy of my own data.

## What this app deliberately does not do

See `DECISIONS.md` for the reasoning behind each: no friend/follow graph in the MVP (aggregate ratings only), no barcode scanning yet (manual catalog submission instead), no brand-owned accounts, no creator/influencer badges, no in-app moderation UI (Supabase Studio only), no ML-based recommendations.
