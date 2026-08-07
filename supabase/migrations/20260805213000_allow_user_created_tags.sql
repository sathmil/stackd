-- "+ Add Tag" in ReviewForm lets a signed-in user add a genuinely new tag to
-- the shared, global tag vocabulary (not a private/per-user tag) -- same
-- table, same visibility as the curated seed tags. Sentiment stays
-- 'neutral' by default at the DB level; the insert always sends 'neutral'
-- since a user typing a free-text label shouldn't get to self-declare it
-- positive/negative.
create policy "tags insert authenticated"
  on tags for insert
  to authenticated
  with check (auth.uid() is not null);
