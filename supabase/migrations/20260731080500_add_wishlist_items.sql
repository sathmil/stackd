-- "Want to Try" -- a private save-for-later list, distinct from the
-- existing public/private `lists` feature (which is for ranked, named
-- stacks the owner curates). This is unnamed, always private, and meant
-- for "I haven't tried this yet but want to" rather than a ranked list.
create table wishlist_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  variant_id uuid not null references product_variants(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, variant_id)
);

create index wishlist_items_user_idx on wishlist_items(user_id, created_at desc);

alter table wishlist_items enable row level security;

-- Private to the owner -- unlike reviews/lists, nothing here is meant to be
-- publicly visible on someone else's profile.
create policy "wishlist_items select own"
  on wishlist_items for select
  using (user_id = auth.uid());

create policy "wishlist_items insert own"
  on wishlist_items for insert
  with check (user_id = auth.uid());

create policy "wishlist_items delete own"
  on wishlist_items for delete
  using (user_id = auth.uid());
