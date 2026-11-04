-- Priority 0: monotonic revisions, atomic calculation writes and parent ownership.
-- Safe for the existing Free-plan AxiomForge project.

create unique index if not exists projects_id_owner_uidx on public.projects(id, owner_id);

alter table public.project_revisions
  drop constraint if exists project_revisions_project_id_fkey;
alter table public.project_revisions
  add constraint project_revisions_project_owner_fkey
  foreign key (project_id, owner_id) references public.projects(id, owner_id) on delete cascade;

alter table public.calculations
  drop constraint if exists calculations_project_id_fkey;
alter table public.calculations
  add constraint calculations_project_owner_fkey
  foreign key (project_id, owner_id) references public.projects(id, owner_id) on delete cascade;

alter table public.project_files
  drop constraint if exists project_files_project_id_fkey;
alter table public.project_files
  add constraint project_files_project_owner_fkey
  foreign key (project_id, owner_id) references public.projects(id, owner_id) on delete cascade;

drop policy if exists revisions_owner_all on public.project_revisions;
drop policy if exists calculations_owner_all on public.calculations;
drop policy if exists files_owner_all on public.project_files;

create policy revisions_owner_parent on public.project_revisions
  for all using (
    auth.uid() = owner_id and exists (
      select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()
    )
  ) with check (
    auth.uid() = owner_id and exists (
      select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()
    )
  );

create policy calculations_owner_parent on public.calculations
  for all using (
    auth.uid() = owner_id and exists (
      select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()
    )
  ) with check (
    auth.uid() = owner_id and exists (
      select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()
    )
  );

create policy files_owner_parent on public.project_files
  for all using (
    auth.uid() = owner_id and exists (
      select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()
    )
  ) with check (
    auth.uid() = owner_id and exists (
      select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()
    )
  );

create or replace function public.save_calculation_atomic(
  p_project_id uuid,
  p_solver text,
  p_inputs jsonb,
  p_outputs jsonb,
  p_record jsonb,
  p_model_state jsonb default '{}'::jsonb
) returns table(revision_id uuid, revision_number integer, calculation_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_revision_id uuid;
  v_revision_number integer;
  v_calculation_id uuid;
begin
  if v_owner is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not exists (select 1 from public.projects p where p.id = p_project_id and p.owner_id = v_owner) then
    raise exception 'project not found or not owned by current user' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_project_id::text, 0));
  select coalesce(max(pr.revision_number), 0) + 1 into v_revision_number
    from public.project_revisions pr where pr.project_id = p_project_id and pr.owner_id = v_owner;
  insert into public.project_revisions(project_id, owner_id, revision_number, inputs, status)
    values (p_project_id, v_owner, v_revision_number, jsonb_build_object('calculation_inputs', coalesce(p_inputs,'{}'::jsonb), 'model_state', coalesce(p_model_state,'{}'::jsonb)), 'calculated')
    returning id into v_revision_id;
  insert into public.calculations(project_id, revision_id, owner_id, solver, inputs, outputs, record)
    values (p_project_id, v_revision_id, v_owner, p_solver, coalesce(p_inputs,'{}'::jsonb), coalesce(p_outputs,'{}'::jsonb), coalesce(p_record,'{}'::jsonb))
    returning id into v_calculation_id;
  return query select v_revision_id, v_revision_number, v_calculation_id;
end;
$$;

revoke all on function public.save_calculation_atomic(uuid,text,jsonb,jsonb,jsonb,jsonb) from public;
grant execute on function public.save_calculation_atomic(uuid,text,jsonb,jsonb,jsonb,jsonb) to authenticated;
