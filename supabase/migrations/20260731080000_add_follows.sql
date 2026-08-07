-- Follow graph -- reverses the earlier "aggregate-only ratings, no follow
-- graph, for MVP" call in DECISIONS.md, at explicit user request, to match
-- the approved profile redesign's followers/following counts.
create table follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_no_self_follow check (follower_id <> followee_id)
);

create index follows_followee_idx on follows(followee_id);
create index follows_follower_idx on follows(follower_id);

alter table follows enable row level security;

-- Follower/following lists and counts are public info on a public profile,
-- same visibility model as reviews/lists elsewhere in the app.
create policy "follows select all"
  on follows for select
  using (true);

create policy "follows insert own"
  on follows for insert
  with check (follower_id = auth.uid());

create policy "follows delete own"
  on follows for delete
  using (follower_id = auth.uid());

-- Same shape as reviews_rate_limit/products_rate_limit -- cheap insurance
-- against one account mass-following as spam, not general abuse protection.
create or replace function check_follow_rate_limit()
returns trigger as $$
begin
  if (select count(*) from follows where follower_id = new.follower_id and created_at > now() - interval '1 day') >= 300 then
    raise exception 'Daily follow limit reached, try again tomorrow';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger follows_rate_limit
  before insert on follows
  for each row execute function check_follow_rate_limit();
