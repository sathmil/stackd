# Catalog naming convention

Written during Phase 7.5, after Phase 7's API imports (Open Food Facts + DSLD)
produced real density but inconsistent data: non-English flavor names, package
sizes baked into product names, and near-duplicate brands the import scripts'
exact-match dedup didn't catch (e.g. "Nakd" / "Nākd" / "Naked.", "Decathlon" /
"Décathlon"). This doc is the checklist any future catalog entry — manual,
scripted, or re-imported — should be checked against, so the same drift
doesn't happen again silently.

## Brand

- One canonical spelling per brand. Official English spelling, ASCII only
  (no accents/diacritics, even if the brand's global trademark uses one —
  optimizing for what a US-audience user will type into search).
- Title Case (`Optimum Nutrition`, not `optimum nutrition` or `OPTIMUM NUTRITION`).
- Before inserting a new brand, check for an existing one with the same
  normalized key: `name.toLowerCase().replace(/[^a-z0-9]/g, '')`. This is
  stricter than a plain case-insensitive match — it also catches spacing/
  punctuation variants like "Sugar Free" vs "Sugarfree" that a simple
  `ilike` exact match misses.

## Product

- `products.name` is the **product line only** — no flavor, no size, no
  marketing copy. ("Gold Standard 100% Whey", not "Gold Standard 100% Whey —
  Double Rich Chocolate 5lb".)
- Flavor and size go on the **variant**, in `product_variants.flavor` /
  `.size` — these columns exist specifically for this and were mostly left
  empty by Phase 7's importers, which is a real reason products ended up
  named things like "500ml Red Bull Energy Drink" instead of a Red Bull
  Energy Drink product with a 500ml variant.
- Title Case, English only.
- Same normalized-key dedup check as brands, scoped to `(brand_id, name)`.

## Category

- `products.category` is one of: `energy_drink`, `protein_bar`, `protein_powder`,
  `protein_shake`, `pre_workout`, `greens_powder`, `supplement`, `snack`, `other`.
- `protein_shake` is specifically ready-to-drink (RTD) shakes (bottles/cans),
  not scoop-and-mix tubs — those are `protein_powder`. The distinction matters
  because Search groups `protein_shake` under "Drinks" alongside energy
  drinks, and `protein_powder` under "Protein" alongside powder tubs.
- This DB category is separate from Search's chip groupings (`Drinks`,
  `Protein`, `Supps`, `Greens`, `Food`, see `CATEGORY_DB_VALUES` in
  `Search.jsx`) — a chip can span multiple DB categories (e.g. "Food" =
  `snack` + `protein_bar`), but each product only has one DB category.

## Variant (flavor/size)

- Title Case flavor names ("Double Rich Chocolate", not "double rich chocolate").
- Size includes a unit ("16 fl oz can", "60g bar", "5g scoop"), not a bare number.

## Nutrition data

- Prefer a live, verified source (Open Food Facts, DSLD) when available and
  when its data passes the checks above.
- When hand-entered from general knowledge of a well-known product's label
  (not fetched live), say so at the point of entry — don't present a
  best-effort recollection as verified fact.
