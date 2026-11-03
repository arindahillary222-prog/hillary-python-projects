create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 1 and 200),
  discipline text,
  location text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_revisions (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(), revision_number integer not null check (revision_number > 0),
  inputs jsonb not null default '{}'::jsonb, status text not null default 'draft', created_at timestamptz not null default now(), unique(project_id, revision_number)
);

create table if not exists public.calculations (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  revision_id uuid references public.project_revisions(id) on delete set null, owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  solver text not null, inputs jsonb not null default '{}'::jsonb, outputs jsonb not null default '{}'::jsonb, record jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(), storage_path text not null unique, filename text not null,
  mime_type text not null, byte_size bigint not null check (byte_size >= 0), metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade, preferences jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);

create index if not exists projects_owner_updated_idx on public.projects(owner_id, updated_at desc);
create index if not exists revisions_project_idx on public.project_revisions(project_id, revision_number desc);
create index if not exists calculations_project_idx on public.calculations(project_id, created_at desc);
create index if not exists files_project_idx on public.project_files(project_id, created_at desc);

alter table public.projects enable row level security;
alter table public.project_revisions enable row level security;
alter table public.calculations enable row level security;
alter table public.project_files enable row level security;
alter table public.user_preferences enable row level security;

create policy projects_owner_all on public.projects for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy revisions_owner_all on public.project_revisions for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy calculations_owner_all on public.calculations for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy files_owner_all on public.project_files for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy preferences_owner_all on public.user_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values ('engineering-files', 'engineering-files', false) on conflict (id) do nothing;
create policy engineering_files_select on storage.objects for select using (bucket_id = 'engineering-files' and auth.uid()::text = (storage.foldername(name))[1]);
create policy engineering_files_insert on storage.objects for insert with check (bucket_id = 'engineering-files' and auth.uid()::text = (storage.foldername(name))[1]);
create policy engineering_files_update on storage.objects for update using (bucket_id = 'engineering-files' and auth.uid()::text = (storage.foldername(name))[1]) with check (bucket_id = 'engineering-files' and auth.uid()::text = (storage.foldername(name))[1]);
create policy engineering_files_delete on storage.objects for delete using (bucket_id = 'engineering-files' and auth.uid()::text = (storage.foldername(name))[1]);
