# Trust & Safety

How moderation works in Stackd. See `DECISIONS.md` for why it's built this way (in short: Studio access itself is the access-control story -- no in-app admin role at this scale).

## Reporting

Any logged-in user can report someone else's review from the product page ("Report" under a review, with an optional reason). This inserts into `review_reports`. There's no client-side select policy on that table -- reports are read directly in Supabase Studio's table editor, not surfaced anywhere in the app. `unique (review_id, reporter_id)` stops the same person reporting the same review twice; the app treats that unique-violation as a silent success rather than an error.

**Handling a report (in Studio):**

1. Open `review_reports`, sorted by `created_at desc`.
2. Follow `review_id` to the actual review; read `reason` and use judgment.
3. If the review should come down: `update reviews set status = 'removed' where id = '<id>'` (RLS's `status = 'visible' or user_id = auth.uid()` select policy means a removed review disappears from everyone else's view immediately, but the author can still see their own).
4. Delete the report row(s) once handled, or leave them -- they're not shown to anyone, so there's no urgency either way.

## Rate limits

Three Postgres triggers cap how many rows a single user can insert in a rolling 24h window -- cheap insurance against one bad actor, not general-purpose abuse protection:

| Table            | Trigger                     | Limit  |
| ---------------- | --------------------------- | ------ |
| `reviews`        | `reviews_rate_limit`        | 50/day |
| `products`       | `products_rate_limit`       | 20/day |
| `review_reports` | `review_reports_rate_limit` | 50/day |

Each raises a Postgres exception past the threshold, which the client surfaces as a normal insert error.

## Content guidelines

`ReviewForm.jsx`'s notes field carries a standing caption: "Share your experience -- avoid medical claims." No automated enforcement -- reports + manual review are the mechanism, per `DECISIONS.md`.

## Duplicate products

Prevented structurally going forward (Phase 0's `products_brand_name_normalized_idx` unique index on `(brand_id, lower(trim(name)))` blocks exact/case/whitespace duplicates at insert time). Near-duplicates that slip through (different wording, e.g. "Ghost Energy" vs "Ghost Energy Drink") are merged by hand -- there's no automated merge tool by design (see `DECISIONS.md`).

**Merging duplicate product B into canonical product A:**

```sql
update product_variants set product_id = 'A_id' where product_id = 'B_id';
delete from products where id = 'B_id';
```

**Merging a duplicate variant (same flavor/size) — loser into survivor:**

```sql
-- reviews: repoint everything that doesn't collide, drop what's left (same
-- user reviewed both survivor and loser -- the unique(variant_id, user_id)
-- constraint won't allow both to point at survivor, so the loser's review
-- for that user is the one that goes)
update reviews set variant_id = 'survivor_id' where variant_id = 'loser_id'
  and not exists (select 1 from reviews where variant_id = 'survivor_id' and user_id = reviews.user_id);
delete from reviews where variant_id = 'loser_id';

-- list_items: same idea -- don't create a duplicate entry in someone's list
update list_items set variant_id = 'survivor_id' where variant_id = 'loser_id'
  and not exists (select 1 from list_items li2 where li2.list_id = list_items.list_id and li2.variant_id = 'survivor_id');
delete from list_items where variant_id = 'loser_id';

delete from product_variants where id = 'loser_id';
```

Run both in the Supabase SQL editor. Back up (or at least `select` and eyeball) the rows being merged first -- these are hand-run, not app-triggered, so there's no undo.

## Suspicious accounts

No automated detection. An eyeball check in Studio (`auth.users`, `profiles`, and their review/product history) if something looks off -- e.g. one account posting many reviews in a short window despite the rate limit not being hit yet.
