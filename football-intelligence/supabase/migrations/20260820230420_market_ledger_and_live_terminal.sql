-- Quantitative upgrade: append-only evidence, versioned tax/settlement rules,
-- executable-price records, and timestamped live-terminal observations.
-- All raw/shared analytical tables remain server-mediated; user-owned records
-- have explicit ownership policies below.

create table public.tax_rules (
  id uuid primary key default gen_random_uuid(),
  jurisdiction text not null,
  tax_rate numeric(6,5) not null check (tax_rate >= 0 and tax_rate < 1),
  tax_base_definition text not null check (tax_base_definition in ('NET_WINNINGS', 'PAYOUT', 'OTHER')),
  effective_from timestamptz not null,
  effective_to timestamptz,
  source_reference text,
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to > effective_from),
  unique (jurisdiction, effective_from)
);
create index tax_rules_jurisdiction_effective_idx on public.tax_rules (jurisdiction, effective_from desc);

create table public.market_consensus_snapshots (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  market_key text not null,
  selection_key text not null,
  observed_at timestamptz not null,
  provider_count integer not null check (provider_count > 0),
  weighted_probability numeric(7,6) not null check (weighted_probability between 0 and 1),
  unweighted_probability numeric(7,6) not null check (unweighted_probability between 0 and 1),
  devig_method_dispersion numeric(9,8) not null check (devig_method_dispersion >= 0),
  sharp_benchmark_probability numeric(7,6) check (sharp_benchmark_probability between 0 and 1),
  provenance jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now(),
  unique (fixture_id, market_key, selection_key, observed_at)
);
create index market_consensus_fixture_time_idx on public.market_consensus_snapshots (fixture_id, observed_at desc);

create table public.prediction_ledger (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  parent_prediction_id uuid references public.predictions(id) on delete set null,
  model_run_id uuid not null references public.model_runs(id),
  market_key text not null,
  selection_key text not null,
  football_model_probability numeric(7,6) not null check (football_model_probability between 0 and 1),
  market_probability numeric(7,6) check (market_probability between 0 and 1),
  final_calibrated_probability numeric(7,6) not null check (final_calibrated_probability between 0 and 1),
  conservative_probability numeric(7,6) not null check (conservative_probability between 0 and 1),
  reliability_score numeric(5,2) not null check (reliability_score between 0 and 100),
  uncertainty_low numeric(7,6) not null check (uncertainty_low between 0 and 1),
  uncertainty_high numeric(7,6) not null check (uncertainty_high between 0 and 1),
  source_snapshot_ids uuid[] not null default '{}',
  feature_version text not null,
  decision_state public.decision_state not null,
  reason_codes text[] not null default '{}',
  calculations jsonb not null default '{}'::jsonb,
  prediction_timestamp timestamptz not null,
  recorded_at timestamptz not null default now(),
  supersedes_ledger_id uuid references public.prediction_ledger(id),
  check (uncertainty_low <= final_calibrated_probability and final_calibrated_probability <= uncertainty_high),
  check (conservative_probability <= final_calibrated_probability)
);
create index prediction_ledger_fixture_time_idx on public.prediction_ledger (fixture_id, prediction_timestamp desc);
create index prediction_ledger_model_idx on public.prediction_ledger (model_run_id, recorded_at desc);

create function public.reject_prediction_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'prediction_ledger is append-only; create a new superseding entry instead';
end;
$$;

create trigger prediction_ledger_no_update_or_delete
before update or delete on public.prediction_ledger
for each row execute function public.reject_prediction_ledger_mutation();

create table public.execution_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fixture_id uuid references public.fixtures(id),
  prediction_ledger_id uuid references public.prediction_ledger(id),
  operator text not null,
  market_key text not null,
  selection_key text not null,
  observed_odds numeric(10,4) not null check (observed_odds > 1),
  requested_stake numeric(14,2) not null check (requested_stake > 0),
  accepted_stake numeric(14,2) check (accepted_stake >= 0),
  accepted_odds numeric(10,4) check (accepted_odds > 1),
  observed_at timestamptz not null,
  placed_at timestamptz,
  status text not null check (status in ('DRAFT', 'PLACED', 'REJECTED', 'PARTIALLY_ACCEPTED', 'SETTLED', 'VOID')),
  tax_rule_id uuid references public.tax_rules(id),
  price_expires_at timestamptz,
  operator_reference text,
  notes text,
  created_at timestamptz not null default now(),
  check ((status = 'DRAFT') or placed_at is not null),
  check (accepted_stake is null or accepted_stake <= requested_stake)
);
create index execution_ledger_user_time_idx on public.execution_ledger (user_id, created_at desc);
create index execution_ledger_fixture_idx on public.execution_ledger (fixture_id, created_at desc);

create table public.settlement_rule_versions (
  id uuid primary key default gen_random_uuid(),
  operator text not null,
  market_key text not null,
  version text not null,
  effective_from timestamptz not null,
  effective_to timestamptz,
  rule_text_reference text not null,
  terms jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to > effective_from),
  unique (operator, market_key, version)
);

create table public.execution_settlements (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null unique references public.execution_ledger(id) on delete cascade,
  settlement_rule_id uuid references public.settlement_rule_versions(id),
  outcome text not null check (outcome in ('WIN', 'LOSS', 'PUSH', 'HALF_WIN', 'HALF_LOSS', 'SPLIT', 'VOID')),
  gross_payout numeric(14,2) not null check (gross_payout >= 0),
  tax_withheld_by_operator numeric(14,2) not null default 0 check (tax_withheld_by_operator >= 0),
  bonus numeric(14,2) not null default 0 check (bonus >= 0),
  net_payout numeric(14,2) not null check (net_payout >= 0),
  settled_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (net_payout = gross_payout + bonus - tax_withheld_by_operator)
);

create table public.live_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  observed_at timestamptz not null,
  match_minute numeric(6,2),
  status public.fixture_status not null,
  home_score smallint check (home_score >= 0),
  away_score smallint check (away_score >= 0),
  home_probability numeric(7,6) check (home_probability between 0 and 1),
  draw_probability numeric(7,6) check (draw_probability between 0 and 1),
  away_probability numeric(7,6) check (away_probability between 0 and 1),
  market_probability numeric(7,6) check (market_probability between 0 and 1),
  home_xg numeric(8,4) check (home_xg >= 0),
  away_xg numeric(8,4) check (away_xg >= 0),
  decimal_odds numeric(10,4) check (decimal_odds > 1),
  edge numeric(8,6),
  reliability numeric(5,2) check (reliability between 0 and 100),
  provenance jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now(),
  unique (fixture_id, observed_at)
);
create index live_metric_snapshots_fixture_time_idx on public.live_metric_snapshots (fixture_id, observed_at desc);

create table public.experiment_registry (
  id uuid primary key default gen_random_uuid(),
  experiment_key text not null unique,
  hypothesis text not null,
  dataset_version text not null,
  feature_version text not null,
  train_period tstzrange,
  validation_period tstzrange,
  test_period tstzrange,
  parameters jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  sample_size integer check (sample_size >= 0),
  confidence_intervals jsonb not null default '{}'::jsonb,
  conclusion text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.tax_rules enable row level security;
alter table public.market_consensus_snapshots enable row level security;
alter table public.prediction_ledger enable row level security;
alter table public.execution_ledger enable row level security;
alter table public.settlement_rule_versions enable row level security;
alter table public.execution_settlements enable row level security;
alter table public.live_metric_snapshots enable row level security;
alter table public.experiment_registry enable row level security;

create policy "execution ledger is private to its owner" on public.execution_ledger
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "settlements are visible to execution owners" on public.execution_settlements
  for select to authenticated
  using (exists (
    select 1 from public.execution_ledger
    where execution_ledger.id = execution_settlements.execution_id
      and execution_ledger.user_id = (select auth.uid())
  ));
