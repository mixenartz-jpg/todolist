-- ═══════════════════════════════════════════════════════════════════
-- 0039 GERİ ALMA — tek öğrencili davranışa dönüş.
--
-- DİKKAT: koçun birden çok öğrencisi varsa geri almadan sonra
-- öğrenciler yine birbirinin görevlerini görür. period_notes'ta aynı
-- dönem için öğrenci başına birden çok satır varsa en yenisi kalır.
-- ═══════════════════════════════════════════════════════════════════

drop trigger if exists zz_tasks_scope_student        on public.tasks;
drop trigger if exists zz_plan_goals_scope_student   on public.plan_goals;
drop trigger if exists zz_week_goals_scope_student   on public.week_goals;
drop trigger if exists zz_period_notes_scope_student on public.period_notes;
drop trigger if exists zz_sources_scope_student      on public.sources;
drop trigger if exists zz_plan_batches_scope_student on public.plan_batches;

-- ── Politikalar 0028 / 0029 / 0034 / 0036 / 0038 hâline ──
drop policy if exists tasks_student_select on public.tasks;
create policy tasks_student_select on public.tasks
  for select to authenticated
  using (user_id = (select public.my_coach_id()));

drop policy if exists task_results_insert on public.task_results;
create policy task_results_insert on public.task_results
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and t.user_id = (select public.my_coach_id())
    )
  );

drop policy if exists sources_select on public.sources;
create policy sources_select on public.sources
  for select to authenticated
  using (coach_id = (select auth.uid()) or coach_id = (select public.my_coach_id()));

drop policy if exists plan_batches_select on public.plan_batches;
create policy plan_batches_select on public.plan_batches
  for select to authenticated
  using (coach_id in ((select auth.uid()), (select public.my_coach_id())));

drop policy if exists source_series_select on public.source_series;
create policy source_series_select on public.source_series
  for select to authenticated
  using (public.source_coach(source_id) in ((select auth.uid()), (select public.my_coach_id())));

drop policy if exists source_sections_select on public.source_sections;
create policy source_sections_select on public.source_sections
  for select to authenticated
  using (public.series_coach(series_id) in ((select auth.uid()), (select public.my_coach_id())));

drop policy if exists source_items_select on public.source_items;
create policy source_items_select on public.source_items
  for select to authenticated
  using (public.section_coach(section_id) in ((select auth.uid()), (select public.my_coach_id())));

drop policy if exists source_item_marks_select on public.source_item_marks;
create policy source_item_marks_select on public.source_item_marks
  for select to authenticated
  using (public.item_coach(item_id) in ((select auth.uid()), (select public.my_coach_id())));

drop policy if exists source_range_marks_select on public.source_range_marks;
create policy source_range_marks_select on public.source_range_marks
  for select to authenticated
  using (public.section_coach(section_id) in ((select auth.uid()), (select public.my_coach_id())));

drop policy if exists task_items_select on public.task_items;
create policy task_items_select on public.task_items
  for select to authenticated
  using (public.task_owner(task_id) in ((select auth.uid()), (select public.my_coach_id())));

-- ── insert_routine_tasks: 0037 gövdesi (student_id'siz) ──
create or replace function public.insert_routine_tasks(p_rows jsonb)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  row jsonb;
  r record;
  d date;
  sched jsonb;
  ok boolean;
  added integer := 0;
  n integer;
begin
  if me is null then raise exception 'Oturum yok'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 400 then
    raise exception 'En fazla 400 satır';
  end if;

  for row in select * from jsonb_array_elements(p_rows) loop
    begin
      d := (row ->> 'due_date')::date;
    exception when others then
      continue;
    end;

    select * into r from public.routines x where x.id = (row ->> 'routine_id')::uuid;
    if not found or r.student_id is null or r.archived_at is not null then continue; end if;
    if me <> r.user_id and me <> r.student_id then continue; end if;
    if d < r.start_date or (r.end_date is not null and d > r.end_date) then continue; end if;

    select s.schedule into sched
      from public.routine_schedules s
     where s.routine_id = r.id and s.effective_from <= d
     order by s.effective_from desc
     limit 1;
    sched := coalesce(sched, '{"kind":"daily"}'::jsonb);

    ok := case sched ->> 'kind'
      when 'daily' then true
      when 'weekdays' then (sched -> 'days') @> to_jsonb(extract(isodow from d)::int)
      when 'flexible' then me = r.user_id
      else false
    end;
    if not ok then continue; end if;

    insert into public.tasks (user_id, created_by, title, due_date, routine_id, estimate_minutes, action)
    values (r.user_id, me, 'Rutin | ' || r.name, d, r.id, r.estimate_minutes, 'Rutin')
    on conflict (routine_id, due_date) where routine_id is not null do nothing;
    get diagnostics n = row_count;
    added := added + n;
  end loop;

  return added;
end;
$$;

-- ── link_student: 0028 gövdesi ──
create or replace function public.link_student(student_email text, coach_email text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  s uuid;
  c uuid;
begin
  select id into s from auth.users where lower(email) = lower(trim(student_email));
  select id into c from auth.users where lower(email) = lower(trim(coach_email));
  if s is null then raise exception 'Öğrenci hesabı bulunamadı: %', student_email; end if;
  if c is null then raise exception 'Koç hesabı bulunamadı: %', coach_email; end if;
  if s = c then raise exception 'Öğrenci ve koç aynı hesap olamaz'; end if;

  insert into public.profiles (user_id, role, coach_id)
  values (s, 'student', c)
  on conflict (user_id) do update set role = 'student', coach_id = excluded.coach_id;

  return 'Bağlandı. Öğrenci çıkış yapıp yeniden girmeli.';
end;
$$;
revoke all on function public.link_student(text, text) from public, anon, authenticated;

-- ── period_notes: dönem başına tek satır ──
delete from public.period_notes a
 using public.period_notes b
 where a.user_id = b.user_id and a.scale = b.scale and a.period_start = b.period_start
   and (a.updated_at, a.ctid) < (b.updated_at, b.ctid);
alter table public.period_notes drop constraint if exists period_notes_owner_period_key;
alter table public.period_notes add primary key (user_id, scale, period_start);

-- ── Sütunlar ve yardımcılar ──
drop index if exists public.plan_batches_student_idx;
alter table public.tasks        drop column if exists student_id;
alter table public.plan_goals   drop column if exists student_id;
alter table public.week_goals   drop column if exists student_id;
alter table public.period_notes drop column if exists student_id;

drop function if exists public.scope_student();
drop function if exists public.task_student(uuid);
drop function if exists public.item_student(uuid);
drop function if exists public.section_student(uuid);
drop function if exists public.series_student(uuid);
drop function if exists public.source_student(uuid);
drop function if exists public.request_student();
drop function if exists public.is_student_of(uuid, uuid);
drop function if exists public.first_student_of(uuid);
