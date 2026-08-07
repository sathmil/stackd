-- Reverses the original "single overall_rating" decision (see comment on
-- reviews.overall_rating in the baseline migration) in favor of three
-- sub-dimensions -- taste, value, effectiveness -- matching the approved UI
-- redesign's rating screen. overall_rating is kept as a stored column
-- (now the average of the three, computed by the app on write) so every
-- existing aggregate view, sort order, and ScorePill display keeps working
-- unchanged.
alter table reviews add column taste_rating numeric(3,1);
alter table reviews add column value_rating numeric(3,1);
alter table reviews add column effectiveness_rating numeric(3,1);

-- Backfill existing reviews so the not-null constraints below don't fail.
update reviews set
  taste_rating = overall_rating,
  value_rating = overall_rating,
  effectiveness_rating = overall_rating
where taste_rating is null;

alter table reviews
  add constraint reviews_taste_rating_check check (taste_rating between 1.0 and 10.0),
  add constraint reviews_value_rating_check check (value_rating between 1.0 and 10.0),
  add constraint reviews_effectiveness_rating_check check (effectiveness_rating between 1.0 and 10.0);

alter table reviews
  alter column taste_rating set not null,
  alter column value_rating set not null,
  alter column effectiveness_rating set not null;
