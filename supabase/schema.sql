-- ============================
-- WC 2026 Predictor - Schema (无账号版)
-- Run this in Supabase SQL editor
-- ============================

-- Matches
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  api_id integer unique not null,
  utc_date timestamptz not null,
  status text not null default 'TIMED',
  stage text not null,
  "group" text,
  home_team_id integer not null,
  home_team_name text not null,
  home_team_short text not null,
  home_team_crest text not null,
  away_team_id integer not null,
  away_team_name text not null,
  away_team_short text not null,
  away_team_crest text not null,
  home_score integer,
  away_score integer,
  home_odds numeric(6,2),
  draw_odds numeric(6,2),
  away_odds numeric(6,2),
  home_pct numeric(5,2) not null default 0,
  draw_pct numeric(5,2) not null default 0,
  away_pct numeric(5,2) not null default 0,
  total_predictions integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.matches enable row level security;
create policy "Matches readable by all" on public.matches for select using (true);
create policy "Service role manages matches" on public.matches for all using (auth.role() = 'service_role');

-- Predictions (username-based, no auth)
create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  match_id uuid references public.matches(id) on delete cascade not null,
  outcome text not null check (outcome in ('HOME', 'DRAW', 'AWAY')),
  home_score_pred integer,
  away_score_pred integer,
  is_correct boolean,
  points integer not null default 0,
  created_at timestamptz not null default now(),
  unique (username, match_id)
);

alter table public.predictions enable row level security;
create policy "Predictions readable by all" on public.predictions for select using (true);
create policy "Anyone can upsert predictions" on public.predictions for insert with check (true);
create policy "Anyone can update predictions" on public.predictions for update using (true);

-- Auto-refresh community stats
create or replace function public.refresh_match_stats()
returns trigger language plpgsql security definer as $$
declare
  v_total integer;
  v_home integer;
  v_draw integer;
  v_away integer;
begin
  select
    count(*),
    count(*) filter (where outcome = 'HOME'),
    count(*) filter (where outcome = 'DRAW'),
    count(*) filter (where outcome = 'AWAY')
  into v_total, v_home, v_draw, v_away
  from public.predictions
  where match_id = new.match_id;

  update public.matches set
    total_predictions = v_total,
    home_pct = case when v_total > 0 then round(v_home * 100.0 / v_total, 2) else 0 end,
    draw_pct = case when v_total > 0 then round(v_draw * 100.0 / v_total, 2) else 0 end,
    away_pct = case when v_total > 0 then round(v_away * 100.0 / v_total, 2) else 0 end,
    updated_at = now()
  where id = new.match_id;

  return new;
end;
$$;

create trigger on_prediction_change
  after insert or update on public.predictions
  for each row execute procedure public.refresh_match_stats();

-- Settle predictions
create or replace function public.settle_match(p_match_id uuid)
returns void language plpgsql security definer as $$
declare
  v_match record;
  v_correct_outcome text;
begin
  select * into v_match from public.matches where id = p_match_id;
  if v_match.home_score is null then raise exception 'Match not finished'; end if;

  v_correct_outcome := case
    when v_match.home_score > v_match.away_score then 'HOME'
    when v_match.home_score < v_match.away_score then 'AWAY'
    else 'DRAW'
  end;

  update public.predictions set
    is_correct = (outcome = v_correct_outcome),
    points = case
      when outcome != v_correct_outcome then 0
      when home_score_pred = v_match.home_score and away_score_pred = v_match.away_score then 8
      when home_score_pred is not null and away_score_pred is not null
        and (home_score_pred - away_score_pred) = (v_match.home_score - v_match.away_score) then 5
      else 3
    end
  where match_id = p_match_id;
end;
$$;

-- Leaderboard view
create view public.leaderboard as
select
  username,
  sum(points) as total_points,
  count(*) filter (where is_correct = true) as correct_predictions,
  count(*) filter (where is_correct is not null) as settled_predictions,
  count(*) as total_predictions,
  case when count(*) filter (where is_correct is not null) > 0
    then round(count(*) filter (where is_correct = true) * 100.0 / count(*) filter (where is_correct is not null), 1)
    else 0
  end as accuracy_pct,
  rank() over (order by sum(points) desc, count(*) filter (where is_correct = true) desc) as rank
from public.predictions
group by username
order by rank;
