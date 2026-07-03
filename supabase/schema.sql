-- Stackd MVP schema
-- Run in the Supabase SQL editor. This stays the single source of truth
-- through early development; Phase 9 introduces real versioned migrations
-- before any production launch. Assumes pgcrypto (gen_random_uuid) is
-- available by default on Supabase.
--
-- Written to always drop and rebuild everything it owns rather than assume
-- a clean database. NOTE: real user data now exists in the dev project
-- (accounts, reviews, etc as of Phase 3.5) -- do NOT re-run this file
-- wholesale against it. Apply new changes as targeted SQL snippets instead;
-- this file stays the reference for what a fresh reset would produce, and
-- is fully safe again once Phase 9's real migrations replace it.

drop view if exists variant_rating_summary cascade;
drop view if exists public_profiles cascade;
drop table if exists review_tags cascade;
drop table if exists review_reports cascade;
drop table if exists list_items cascade;
drop table if exists lists cascade;
drop table if exists reviews cascade;
drop table if exists tags cascade;
drop table if exists product_variants cascade;
drop table if exists products cascade;
drop table if exists brands cascade;
drop table if exists events cascade;
drop table if exists feature_flags cascade;
drop table if exists profiles cascade;
drop function if exists set_updated_at cascade;
drop function if exists handle_new_user cascade;
drop function if exists protect_ai_fields cascade;
drop function if exists check_review_rate_limit cascade;
drop function if exists check_product_rate_limit cascade;
drop trigger if exists on_auth_user_created on auth.users;

create extension if not exists pg_trgm;

-- ============================================================
-- helpers
-- ============================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- profiles (extends auth.users)
-- ============================================================

create table profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  username               text unique not null,
  display_name           text,
  avatar_url             text,
  birthdate              date,
  disclaimer_accepted_at timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- auto-create a bare profile row on signup. Username uses the full uuid
-- (no truncation) so it's collision-proof by construction -- it's the
-- user's own primary key. Username/birthdate/disclaimer get filled in
-- client-side right after signup.
--
-- This trigger fires from Supabase's Auth service connection (not the SQL
-- editor / PostgREST connections everything else runs through), and that
-- connection's search_path does not include `public` -- an unqualified
-- `profiles` reference resolves to "relation does not exist" there even
-- though the table obviously exists. Schema-qualify the table and pin
-- search_path explicitly so this can't silently break again.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, 'user_' || replace(new.id::text, '-', ''));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- the trigger above only fires for NEW auth.users rows. Since this reset
-- script drops and recreates `profiles` but never touches Supabase's own
-- `auth.users` table, any account created before a reset (e.g. test
-- accounts) would otherwise be left with no profile row at all after a
-- re-run. Backfill one for every existing auth user that's missing it.
insert into profiles (id, username)
select u.id, 'user_' || replace(u.id::text, '-', '')
from auth.users u
where not exists (select 1 from profiles p where p.id = u.id)
on conflict (id) do nothing;

-- profiles holds sensitive data (birthdate) so the base table is owner-only
-- (RLS: id = auth.uid()). This view's entire purpose is the opposite --
-- exposing a safe public *subset* of columns to everyone -- so it must NOT
-- use security_invoker: that would make it enforce the querying user's own
-- RLS on the underlying table, which is owner-only, meaning every OTHER
-- user's row would silently return zero rows through this view too (this
-- was a real bug: reviews showed real ratings but "Unknown" as the
-- reviewer, since fetchProfilesByIds came back empty for anyone but
-- yourself). Running as the view's owner (the default) is what lets it
-- bypass per-row RLS -- safe here specifically because the column list is
-- deliberately restricted to non-sensitive fields.
create view public_profiles as
  select id, username, display_name, avatar_url
  from profiles;

alter table profiles enable row level security;

create policy "profiles select own"
  on profiles for select
  using (id = auth.uid());

create policy "profiles update own"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

grant select on public_profiles to anon, authenticated;

-- ============================================================
-- brands (simple metadata -- no login/ownership at this stage)
-- ============================================================

create table brands (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  logo_url    text,
  website_url text,
  is_verified boolean not null default false,
  created_at  timestamptz not null default now()
);

create index brands_name_trgm_idx on brands using gin (name gin_trgm_ops);

alter table brands enable row level security;

create policy "brands select all"
  on brands for select
  using (true);

create policy "brands insert authenticated"
  on brands for insert
  with check (auth.uid() is not null);

-- no update/delete policy: brand metadata edits happen via Studio.

-- ============================================================
-- products (parent product, e.g. "Celsius")
-- ============================================================

create table products (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid references brands(id),
  brand_name  text not null, -- cached/denormalized for fast list rendering & search
  name        text not null,
  category    text not null check (category in (
                'energy_drink', 'protein_bar', 'protein_powder',
                'pre_workout', 'greens_powder', 'supplement', 'snack', 'other'
              )),
  description text,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'flagged', 'rejected')),
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- normalized uniqueness: "Bang Energy" / "bang energy " / "BANG ENERGY"
-- collide here instead of silently becoming duplicate catalog rows.
create unique index products_brand_name_normalized_idx on products (brand_id, lower(trim(name)));

create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

create index products_status_idx on products(status);
create index products_category_idx on products(category);
create index products_name_trgm_idx on products using gin (name gin_trgm_ops);

alter table products enable row level security;

create policy "products select approved or own"
  on products for select
  using (status = 'approved' or created_by = auth.uid());

create policy "products insert own"
  on products for insert
  with check (created_by = auth.uid());

create policy "products update own"
  on products for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- simple abuse guard: cap how many products a single user can submit in a
-- day -- cheap insurance against a single bad actor, not a general-purpose
-- rate limiter (same shape as reviews_rate_limit above).
create or replace function check_product_rate_limit()
returns trigger as $$
begin
  if (select count(*) from products where created_by = new.created_by and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Daily product submission limit reached, try again tomorrow';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger products_rate_limit
  before insert on products
  for each row execute function check_product_rate_limit();

-- ============================================================
-- product_variants (flavor/size -- this is what actually gets rated)
-- ============================================================

create table product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references products(id) on delete cascade,
  flavor         text,
  size           text,
  upc            text unique,
  image_url      text,
  image_alt      text,

  -- nutrition facts (macros)
  serving_size   text,
  calories       numeric(6,1),
  protein_g      numeric(5,1),
  sugar_g        numeric(5,1),
  carbs_g        numeric(5,1),
  fiber_g        numeric(5,1),
  fat_g          numeric(5,1),
  caffeine_mg    numeric(6,1),
  sodium_mg      numeric(6,1),

  -- structured dietary/quality attributes
  is_vegan       boolean not null default false,
  is_keto        boolean not null default false,
  is_gluten_free boolean not null default false,
  certifications text[] not null default '{}',

  -- where did this record's data come from
  data_source    text not null default 'manual' check (data_source in ('manual', 'external_api')),

  -- raw ingredient list + AI analysis of it (ingredient quality is
  -- AI-computed, not user-submitted -- see reviews table below)
  ingredients_text          text,
  ai_ingredient_quality_score numeric(3,1) check (ai_ingredient_quality_score between 1.0 and 10.0),
  ai_ingredient_summary     text,
  ai_ingredient_flags       jsonb not null default '[]',
  ai_ingredient_analyzed_at timestamptz,
  ai_model                  text,
  ai_analysis_version       int not null default 1,
  ai_analysis_status        text not null default 'pending' check (ai_analysis_status in ('pending', 'succeeded', 'failed')),

  status      text not null default 'pending' check (status in ('pending', 'approved', 'flagged', 'rejected')),
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (product_id, flavor, size)
);

create trigger product_variants_set_updated_at
  before update on product_variants
  for each row execute function set_updated_at();

-- RLS is row-level, not column-level -- the "variants update own" policy
-- below would otherwise let a user hand-edit their own ai_ingredient_*
-- fields directly. This trigger reverts those columns to their previous
-- value unless the write comes from the service role (only Phase 8's
-- Edge Function uses the service role key).
create or replace function protect_ai_fields()
returns trigger as $$
begin
  if auth.role() <> 'service_role' then
    new.ai_ingredient_quality_score := old.ai_ingredient_quality_score;
    new.ai_ingredient_summary := old.ai_ingredient_summary;
    new.ai_ingredient_flags := old.ai_ingredient_flags;
    new.ai_ingredient_analyzed_at := old.ai_ingredient_analyzed_at;
    new.ai_model := old.ai_model;
    new.ai_analysis_version := old.ai_analysis_version;
    new.ai_analysis_status := old.ai_analysis_status;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger product_variants_protect_ai_fields
  before update on product_variants
  for each row execute function protect_ai_fields();

create index product_variants_product_id_idx on product_variants(product_id);
create index product_variants_status_idx on product_variants(status);
create index product_variants_upc_idx on product_variants(upc);

alter table product_variants enable row level security;

create policy "variants select approved or own"
  on product_variants for select
  using (status = 'approved' or created_by = auth.uid());

create policy "variants insert own"
  on product_variants for insert
  with check (created_by = auth.uid());

create policy "variants update own"
  on product_variants for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- ============================================================
-- tags (lookup, so the vocabulary can grow without a migration)
-- ============================================================

create table tags (
  id        uuid primary key default gen_random_uuid(),
  label     text unique not null,
  sentiment text not null check (sentiment in ('positive', 'negative', 'neutral')) default 'neutral',
  is_active boolean not null default true
);

insert into tags (label, sentiment) values
  ('great macros',       'positive'),
  ('clean ingredients',  'positive'),
  ('budget friendly',    'positive'),
  ('dessert replacement','positive'),
  ('keeps me full',      'positive'),
  ('amazing flavor',     'positive'),
  ('mixes perfectly',    'positive'),
  ('daily staple',       'positive'),
  ('chalky',             'negative'),
  ('too sweet',          'negative'),
  ('weird aftertaste',   'negative'),
  ('expensive',          'negative'),
  ('upset my stomach',   'negative'),
  ('overhyped',          'negative');

alter table tags enable row level security;

create policy "tags select active"
  on tags for select
  using (is_active);

-- no insert/update/delete policy: tag vocabulary is managed via the
-- service role (Supabase dashboard), not by app users.

-- ============================================================
-- reviews (one per user per variant; editable via upsert)
-- ============================================================

create table reviews (
  id                          uuid primary key default gen_random_uuid(),
  variant_id                  uuid not null references product_variants(id) on delete cascade,
  user_id                     uuid not null references auth.users(id) on delete cascade,

  -- single subjective score, 1-10 -- deliberately not split into taste /
  -- value / etc sub-dimensions: one number is faster to give and reduces
  -- ambiguity, which matters more for review volume than granularity does
  -- at this stage. Ingredient quality is intentionally NOT here -- it's
  -- AI-computed on the variant (see product_variants above) and shown as
  -- objective info, not blended into anyone's personal rating.
  overall_rating               numeric(3,1) not null check (overall_rating between 1.0 and 10.0),

  would_buy_again             boolean,
  notes                       text,

  status      text not null default 'visible' check (status in ('visible', 'flagged', 'removed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (variant_id, user_id)
);

create trigger reviews_set_updated_at
  before update on reviews
  for each row execute function set_updated_at();

create index reviews_variant_id_idx on reviews(variant_id);
create index reviews_user_id_idx on reviews(user_id);
create index reviews_created_at_idx on reviews(created_at desc);

alter table reviews enable row level security;

create policy "reviews select visible or own"
  on reviews for select
  using (status = 'visible' or user_id = auth.uid());

create policy "reviews insert own"
  on reviews for insert
  with check (user_id = auth.uid());

create policy "reviews update own"
  on reviews for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "reviews delete own"
  on reviews for delete
  using (user_id = auth.uid());

-- simple abuse guard: cap how many reviews a single user can post in a day.
-- the (variant_id, user_id) unique constraint already prevents spamming the
-- same product, this guards against spamming many different products.
create or replace function check_review_rate_limit()
returns trigger as $$
begin
  if (select count(*) from reviews where user_id = new.user_id and created_at > now() - interval '1 day') >= 50 then
    raise exception 'Daily review limit reached, try again tomorrow';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger reviews_rate_limit
  before insert on reviews
  for each row execute function check_review_rate_limit();

-- ============================================================
-- review_tags (join table)
-- ============================================================

create table review_tags (
  review_id uuid not null references reviews(id) on delete cascade,
  tag_id    uuid not null references tags(id) on delete cascade,
  primary key (review_id, tag_id)
);

create index review_tags_tag_id_idx on review_tags(tag_id);

alter table review_tags enable row level security;

create policy "review_tags select visible or own"
  on review_tags for select
  using (exists (
    select 1 from reviews r
    where r.id = review_tags.review_id
      and (r.status = 'visible' or r.user_id = auth.uid())
  ));

create policy "review_tags insert own"
  on review_tags for insert
  with check (exists (
    select 1 from reviews r
    where r.id = review_tags.review_id and r.user_id = auth.uid()
  ));

create policy "review_tags delete own"
  on review_tags for delete
  using (exists (
    select 1 from reviews r
    where r.id = review_tags.review_id and r.user_id = auth.uid()
  ));

-- ============================================================
-- review_reports (trust & safety -- users flag, you review in Studio)
-- ============================================================

create table review_reports (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null references reviews(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason      text,
  created_at  timestamptz not null default now()
);

alter table review_reports enable row level security;

create policy "review_reports insert authenticated"
  on review_reports for insert
  with check (reporter_id = auth.uid());

-- no select policy for the client: you read these directly in Studio.

-- ============================================================
-- lists / list_items ("stacks" -- ranked, references variants)
-- ============================================================

create table lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  is_public   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger lists_set_updated_at
  before update on lists
  for each row execute function set_updated_at();

alter table lists enable row level security;

create policy "lists select public or own"
  on lists for select
  using (is_public or user_id = auth.uid());

create policy "lists insert own"
  on lists for insert
  with check (user_id = auth.uid());

create policy "lists update own"
  on lists for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "lists delete own"
  on lists for delete
  using (user_id = auth.uid());

create table list_items (
  id            uuid primary key default gen_random_uuid(),
  list_id       uuid not null references lists(id) on delete cascade,
  variant_id    uuid not null references product_variants(id) on delete cascade,
  rank_position int not null check (rank_position > 0),
  added_at      timestamptz not null default now(),
  unique (list_id, variant_id)
);

create index list_items_list_id_idx on list_items(list_id, rank_position);

alter table list_items enable row level security;

create policy "list_items select public or own"
  on list_items for select
  using (exists (
    select 1 from lists l
    where l.id = list_items.list_id and (l.is_public or l.user_id = auth.uid())
  ));

create policy "list_items insert own list"
  on list_items for insert
  with check (exists (
    select 1 from lists l where l.id = list_items.list_id and l.user_id = auth.uid()
  ));

create policy "list_items update own list"
  on list_items for update
  using (exists (
    select 1 from lists l where l.id = list_items.list_id and l.user_id = auth.uid()
  ));

create policy "list_items delete own list"
  on list_items for delete
  using (exists (
    select 1 from lists l where l.id = list_items.list_id and l.user_id = auth.uid()
  ));

-- ============================================================
-- events (lightweight product analytics)
-- ============================================================

create table events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  event_name text not null,
  metadata   jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table events enable row level security;

create policy "events insert own"
  on events for insert
  with check (user_id = auth.uid());

-- no select policy: you read this directly in Studio for now.

-- ============================================================
-- feature_flags (manual kill-switch, no deploy required)
-- ============================================================

create table feature_flags (
  key     text primary key,
  enabled boolean not null default true
);

insert into feature_flags (key, enabled) values
  ('ai_ingredient_analysis', true),
  ('product_submission', true);

alter table feature_flags enable row level security;

create policy "feature_flags select all"
  on feature_flags for select
  using (true);

-- no client write policy: flipped manually in Studio.

-- ============================================================
-- variant_rating_summary (aggregate view -- powers overall score)
-- ============================================================

-- left join from product_variants (not an aggregate over reviews) so a
-- variant with zero reviews still appears -- otherwise a freshly-added
-- product would be invisible to any query joining against this view.
-- security_invoker means this view respects the querying user's own RLS.
create view variant_rating_summary with (security_invoker = true) as
select
  v.id as variant_id,
  count(r.id) as ratings_count,
  round(avg(r.overall_rating), 1) as overall_score,
  v.ai_ingredient_quality_score,
  round(100.0 * sum(case when r.would_buy_again then 1 else 0 end) / nullif(count(r.id), 0), 0) as buy_again_pct
from product_variants v
left join reviews r on r.variant_id = v.id and r.status = 'visible'
group by v.id, v.ai_ingredient_quality_score;

grant select on variant_rating_summary to anon, authenticated;

-- ============================================================
-- storage buckets (product images, avatars)
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('product-images', 'product-images', true, 5242880),
  ('avatars', 'avatars', true, 5242880)
on conflict (id) do nothing;

-- storage.objects isn't dropped by the reset block above (it's Supabase's
-- own internal table, shared across every bucket) -- so these policies
-- need explicit drop-if-exists to stay safely re-runnable.
drop policy if exists "product-images public read" on storage.objects;
drop policy if exists "product-images authenticated insert" on storage.objects;
drop policy if exists "avatars public read" on storage.objects;
drop policy if exists "avatars owner insert" on storage.objects;
drop policy if exists "avatars owner update" on storage.objects;

create policy "product-images public read"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "product-images authenticated insert"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and auth.uid() is not null);

-- avatars are uploaded to a path like "{user_id}/avatar.webp" so ownership
-- can be checked from the path itself.
create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars owner insert"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars owner update"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- dev seed data (separate at-scale import happens in Phase 7)
-- ============================================================

insert into brands (name, is_verified) values
  ('Celsius', true),
  ('Ghost', true),
  ('Rxbar', true),
  ('Optimum Nutrition', true)
on conflict (name) do nothing;

with b as (select id, name from brands)
insert into products (brand_id, brand_name, name, category, status)
select b.id, b.name, p.name, p.category, 'approved'
from (values
  ('Celsius', 'Celsius', 'energy_drink'),
  ('Ghost', 'Ghost Energy', 'energy_drink'),
  ('Rxbar', 'Rxbar', 'protein_bar'),
  ('Optimum Nutrition', 'Gold Standard Whey', 'protein_powder')
) as p(brand, name, category)
join b on b.name = p.brand
on conflict (brand_id, (lower(trim(name)))) do nothing;

with pv as (select id, name from products)
insert into product_variants (product_id, flavor, size, calories, protein_g, sugar_g, caffeine_mg, ingredients_text, status)
select pv.id, v.flavor, v.size, v.calories, v.protein_g, v.sugar_g, v.caffeine_mg, v.ingredients_text, 'approved'
from (values
  ('Celsius', 'Sparkling Orange', '12 fl oz', 10, 0, 0, 200, 'Carbonated water, citric acid, natural flavors, taurine, caffeine, green tea extract, ginger extract, vitamin b12, biotin, chromium'),
  ('Ghost Energy', 'Blue Raspberry', '16 fl oz', 5, 0, 0, 200, 'Carbonated water, citric acid, natural and artificial flavors, caffeine anhydrous, l-carnitine, taurine, sucralose'),
  ('Rxbar', 'Chocolate Sea Salt', '1.83 oz bar', 210, 12, 13, 0, 'Dates, egg whites, almonds, cashews, cocoa, sea salt'),
  ('Gold Standard Whey', 'Double Rich Chocolate', '1 scoop (30g)', 120, 24, 1, 0, 'Whey protein isolate, whey protein concentrate, cocoa, natural and artificial flavors, lecithin, salt, acesulfame potassium, sucralose')
) as v(product_name, flavor, size, calories, protein_g, sugar_g, caffeine_mg, ingredients_text)
join pv on pv.name = v.product_name
on conflict (product_id, flavor, size) do nothing;

-- ============================================================
-- table-level grants
-- ============================================================
-- RLS policies (above) control WHICH ROWS a role can touch -- they don't
-- grant the role permission to touch the table at all. That's this
-- separate, independent layer. Both are required together; RLS alone
-- does nothing without a baseline grant, and a grant alone with RLS
-- enabled still restricts to whatever the policies allow.
--
-- service_role additionally bypasses RLS policies entirely (that's what
-- makes it "trusted" -- Phase 8's Edge Function uses it), but it is NOT
-- exempt from this table-level grant layer -- it still needs an explicit
-- GRANT like any other role, which is easy to assume away and miss.

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant select on all tables in schema public to anon;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- so tables added in later phases automatically get the same baseline
-- grants without this section needing to be remembered/updated by hand.
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public grant select on tables to anon;
