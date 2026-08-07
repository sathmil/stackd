-- Trending Stacks (Feed's list carousel) used to borrow its cover photo
-- from the #1-ranked product's own image_url, which meant setting a
-- stylized/lifestyle cover photo for a list silently overwrote that
-- product's real photo everywhere else it's shown (its ProductPage, its
-- own review cards in the feed, etc). A dedicated column decouples the
-- two -- fetchTrendingLists falls back to the top product's image when
-- this is null, so existing lists keep working unchanged.
alter table lists add column cover_image_url text;
