-- Adds a distinct category for ready-to-drink protein shakes, separate from
-- protein_powder (scoop tubs). Needed so the Search UI's "Drinks" grouping
-- can include RTD shakes without also pulling in powder tubs, which share
-- no meaningful browsing context with energy drinks/RTD shakes.
alter table products drop constraint products_category_check;
alter table products add constraint products_category_check check (category in (
  'energy_drink', 'protein_bar', 'protein_powder', 'protein_shake',
  'pre_workout', 'greens_powder', 'supplement', 'snack', 'other'
));
