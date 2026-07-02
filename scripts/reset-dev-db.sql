-- Resets transactional/user-generated data for repeatable QA, while
-- keeping the catalog (brands/products/product_variants/tags) and any
-- auth.users/profiles rows intact. Run against the DEV Supabase project
-- only -- never against production.

truncate table review_tags cascade;
truncate table review_reports cascade;
truncate table reviews cascade;
truncate table list_items cascade;
truncate table lists cascade;
truncate table events cascade;
