create extension if not exists pgcrypto;

create type public.fixture_status as enum ('SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED');
create type public.availability_status as enum ('AVAILABLE', 'DOUBTFUL', 'OUT', 'SUSPENDED', 'RETURNED');
create type public.intelligence_status as enum ('UNCONFIRMED', 'LIKELY', 'CONFIRMED', 'REJECTED');
create type public.decision_state as enum ('QUALIFIED', 'WATCH', 'NO_BET');
create type public.alert_priority as enum ('INFO', 'IMPORTANT', 'CRITICAL');
create type public.source_tier as enum ('A', 'B', 'C', 'D');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  currency text not null default 'UGX' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'Africa/Kampala',
  weekly_bankroll numeric(14,2) not null default 0 check (weekly_bankroll >= 0),
  max_risk_per_bet numeric(5,4) not null default 0.02 check (max_risk_per_bet between 0 and 0.10),
  fractional_kelly numeric(5,4) not null default 0.10 check (fractional_kelly between 0 and 0.25),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  canonical_code text not null unique,
  name text not null,
  country text,
  provider_metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id),
  name text not null,
  starts_on date,
  ends_on date,
  provider_metadata jsonb not null default '{}'::jsonb,
  unique (competition_id, name)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null unique,
  country text,
  venue_name text,
  founded_year integer check (founded_year between 1800 and 2200),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  date_of_birth date,
  nationality text,
  primary_position text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (canonical_name, date_of_birth)
);

create table public.provider_entities (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  entity_type text not null check (entity_type in ('competition', 'season', 'team', 'player', 'fixture', 'bookmaker')),
  provider_entity_id text not null,
  canonical_entity_id uuid not null,
  created_at timestamptz not null default now(),
  unique (provider, entity_type, provider_entity_id)
);

create table public.team_aliases (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  provider text,
  alias text not null,
  normalized_alias text not null,
  unique (provider, normalized_alias)
);

create table public.player_aliases (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  provider text,
  alias text not null,
  normalized_alias text not null,
  unique (provider, normalized_alias)
);

create table public.fixtures (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id),
  season_id uuid references public.seasons(id),
  home_team_id uuid not null references public.teams(id),
  away_team_id uuid not null references public.teams(id),
  provider_fixture_id text,
  round_name text,
  venue_name text,
  referee_name text,
  kickoff_at timestamptz not null,
  status public.fixture_status not null default 'SCHEDULED',
  home_goals smallint check (home_goals >= 0),
  away_goals smallint check (away_goals >= 0),
  source text not null,
  source_event_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  freshness_seconds integer not null default 0 check (freshness_seconds >= 0),
  confidence numeric(4,3) not null default 1 check (confidence between 0 and 1),
  raw_payload jsonb not null default '{}'::jsonb,
  unique (source, provider_fixture_id)
);
create index fixtures_kickoff_idx on public.fixtures (kickoff_at);
create index fixtures_competition_idx on public.fixtures (competition_id, season_id);

create table public.lineups (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  team_id uuid not null references public.teams(id),
  player_id uuid references public.players(id),
  lineup_type text not null check (lineup_type in ('PREDICTED', 'CONFIRMED')),
  starting boolean not null default false,
  position text,
  formation text,
  lineup_probability numeric(4,3) check (lineup_probability between 0 and 1),
  source text not null,
  source_event_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  confidence numeric(4,3) not null default 0.5 check (confidence between 0 and 1),
  unique (fixture_id, team_id, player_id, lineup_type)
);

create table public.injuries (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id),
  team_id uuid references public.teams(id),
  fixture_id uuid references public.fixtures(id),
  status public.availability_status not null,
  reason text,
  expected_return_at timestamptz,
  player_impact_score numeric(7,3),
  replacement_quality_score numeric(7,3),
  source text not null,
  source_event_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  confidence numeric(4,3) not null default 0.5 check (confidence between 0 and 1),
  resolved_at timestamptz
);

create table public.suspensions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id),
  team_id uuid references public.teams(id),
  fixture_id uuid references public.fixtures(id),
  reason text,
  starts_at timestamptz,
  ends_at timestamptz,
  source text not null,
  source_event_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  confidence numeric(4,3) not null default 0.8 check (confidence between 0 and 1)
);

create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  provider_event_id text,
  event_type text not null,
  minute smallint check (minute between 0 and 130),
  team_id uuid references public.teams(id),
  player_id uuid references public.players(id),
  payload jsonb not null default '{}'::jsonb,
  source text not null,
  source_event_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  unique (source, provider_event_id)
);

create table public.team_match_stats (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  team_id uuid not null references public.teams(id),
  goals numeric(7,3),
  xg numeric(7,3),
  xga numeric(7,3),
  non_penalty_xg numeric(7,3),
  shots integer, shots_on_target integer, big_chances integer,
  possession numeric(5,2) check (possession between 0 and 100),
  passes integer, corners integer, crosses integer,
  clean_sheet boolean,
  source text not null,
  source_event_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  raw_metrics jsonb not null default '{}'::jsonb,
  unique (fixture_id, team_id, source)
);

create table public.player_match_stats (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  player_id uuid not null references public.players(id),
  team_id uuid references public.teams(id),
  minutes integer check (minutes between 0 and 130),
  starts boolean, goals integer, assists integer,
  xg numeric(7,3), xa numeric(7,3), shots integer, shots_on_target integer,
  key_passes integer, tackles integer, interceptions integer,
  rating numeric(4,2),
  source text not null,
  source_event_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  raw_metrics jsonb not null default '{}'::jsonb,
  unique (fixture_id, player_id, source)
);

create table public.xg_records (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  team_id uuid references public.teams(id),
  player_id uuid references public.players(id),
  xg numeric(8,4) not null check (xg >= 0),
  xg_type text not null default 'match',
  source text not null,
  source_event_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb
);

create table public.bookmaker_markets (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  bookmaker_key text not null,
  bookmaker_name text not null,
  market_key text not null,
  created_at timestamptz not null default now(),
  unique (provider, bookmaker_key, market_key)
);

create table public.odds_snapshots (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  bookmaker_market_id uuid references public.bookmaker_markets(id),
  market_key text not null,
  selection_key text not null,
  decimal_odds numeric(10,4) not null check (decimal_odds > 1),
  implied_probability numeric(8,6) not null check (implied_probability between 0 and 1),
  captured_at timestamptz not null,
  source text not null,
  ingested_at timestamptz not null default now(),
  unique (fixture_id, bookmaker_market_id, selection_key, captured_at)
);
create index odds_snapshots_fixture_time_idx on public.odds_snapshots (fixture_id, captured_at desc);

create table public.weather_snapshots (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  forecast_for timestamptz not null,
  observed_at timestamptz not null,
  temperature_c numeric(5,2), rain_mm numeric(7,2), wind_kph numeric(6,2),
  wind_gust_kph numeric(6,2), humidity numeric(5,2),
  source text not null,
  ingested_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb
);

create table public.news_items (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_url text not null,
  title text not null,
  published_at timestamptz not null,
  source_tier public.source_tier not null,
  content_hash text not null,
  ingested_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  unique (source, content_hash)
);

create table public.social_items (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  source_account text,
  source_url text not null,
  published_at timestamptz not null,
  source_tier public.source_tier not null default 'D',
  content_hash text not null,
  ingested_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  unique (platform, content_hash)
);

create table public.intelligence_events (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid references public.fixtures(id),
  team_id uuid references public.teams(id),
  player_id uuid references public.players(id),
  event_type text not null,
  status public.intelligence_status not null default 'UNCONFIRMED',
  source_tier public.source_tier not null,
  corroboration_score numeric(5,2) not null default 0 check (corroboration_score between 0 and 100),
  expected_model_impact numeric(7,4),
  source_url text,
  event_timestamp timestamptz not null,
  ingested_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table public.model_runs (
  id uuid primary key default gen_random_uuid(),
  model_name text not null,
  model_version text not null,
  feature_version text not null,
  training_start timestamptz,
  training_end timestamptz,
  validation_metrics jsonb not null default '{}'::jsonb,
  calibration_method text,
  created_at timestamptz not null default now(),
  unique (model_name, model_version)
);

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  model_run_id uuid not null references public.model_runs(id),
  market_key text not null,
  selection_key text not null,
  predicted_probability numeric(7,6) not null check (predicted_probability between 0 and 1),
  uncertainty_low numeric(7,6) check (uncertainty_low between 0 and 1),
  uncertainty_high numeric(7,6) check (uncertainty_high between 0 and 1),
  reliability_score numeric(5,2) not null check (reliability_score between 0 and 100),
  agreement_score numeric(5,2) not null check (agreement_score between 0 and 100),
  prediction_timestamp timestamptz not null,
  source_snapshot_ids uuid[] not null default '{}',
  rationale jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index predictions_fixture_time_idx on public.predictions (fixture_id, prediction_timestamp desc);

create table public.calibration_results (
  id uuid primary key default gen_random_uuid(),
  model_run_id uuid not null references public.model_runs(id),
  competition_id uuid references public.competitions(id),
  market_key text,
  probability_bucket text not null,
  prediction_count integer not null check (prediction_count >= 0),
  predicted_average numeric(7,6),
  outcome_frequency numeric(7,6),
  calibration_gap numeric(7,6),
  created_at timestamptz not null default now()
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  prediction_id uuid references public.predictions(id),
  state public.decision_state not null,
  reason_codes text[] not null default '{}',
  expected_value numeric(9,6),
  fair_odds numeric(10,4),
  market_odds numeric(10,4),
  opportunity_score numeric(5,2) check (opportunity_score between 0 and 100),
  created_at timestamptz not null default now(),
  superseded_at timestamptz
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid references public.fixtures(id),
  user_id uuid references auth.users(id) on delete cascade,
  priority public.alert_priority not null,
  alert_type text not null,
  title text not null,
  body text not null,
  source_event_id uuid references public.intelligence_events(id),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.bankroll_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fixture_id uuid references public.fixtures(id),
  recommendation_id uuid references public.recommendations(id),
  transaction_type text not null check (transaction_type in ('DEPOSIT', 'WITHDRAWAL', 'STAKE', 'SETTLEMENT')),
  amount numeric(14,2) not null,
  currency text not null default 'UGX' check (currency ~ '^[A-Z]{3}$'),
  placed_odds numeric(10,4) check (placed_odds > 1),
  closing_odds numeric(10,4) check (closing_odds > 1),
  created_at timestamptz not null default now()
);

create table public.data_quality_events (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid references public.fixtures(id),
  provider text,
  check_name text not null,
  severity public.alert_priority not null,
  details jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.competitions enable row level security;
alter table public.seasons enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.provider_entities enable row level security;
alter table public.team_aliases enable row level security;
alter table public.player_aliases enable row level security;
alter table public.fixtures enable row level security;
alter table public.lineups enable row level security;
alter table public.injuries enable row level security;
alter table public.suspensions enable row level security;
alter table public.match_events enable row level security;
alter table public.team_match_stats enable row level security;
alter table public.player_match_stats enable row level security;
alter table public.xg_records enable row level security;
alter table public.bookmaker_markets enable row level security;
alter table public.odds_snapshots enable row level security;
alter table public.weather_snapshots enable row level security;
alter table public.news_items enable row level security;
alter table public.social_items enable row level security;
alter table public.intelligence_events enable row level security;
alter table public.model_runs enable row level security;
alter table public.predictions enable row level security;
alter table public.calibration_results enable row level security;
alter table public.recommendations enable row level security;
alter table public.alerts enable row level security;
alter table public.bankroll_transactions enable row level security;
alter table public.data_quality_events enable row level security;

create policy "profiles are private to their owner" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "alerts are private to their owner" on public.alerts
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "bankroll is private to its owner" on public.bankroll_transactions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
