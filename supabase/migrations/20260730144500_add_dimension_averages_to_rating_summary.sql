-- Adds per-dimension averages to variant_rating_summary so ProductPage can
-- show the Taste/Value/Effectiveness breakdown bars from the approved UI
-- redesign, alongside the existing overall_score.
-- New columns appended at the end, not interleaved -- postgres only allows
-- create-or-replace to add trailing columns to a view, not reorder existing
-- ones, without a drop.
create or replace view variant_rating_summary with (security_invoker = true) as
select
  v.id as variant_id,
  count(r.id) as ratings_count,
  round(avg(r.overall_rating), 1) as overall_score,
  v.ai_ingredient_quality_score,
  round(100.0 * sum(case when r.would_buy_again then 1 else 0 end) / nullif(count(r.id), 0), 0) as buy_again_pct,
  round(avg(r.taste_rating), 1) as taste_score,
  round(avg(r.value_rating), 1) as value_score,
  round(avg(r.effectiveness_rating), 1) as effectiveness_score
from product_variants v
left join reviews r on r.variant_id = v.id and r.status = 'visible'
group by v.id, v.ai_ingredient_quality_score;

grant select on variant_rating_summary to anon, authenticated;
