-- ═══════════════════════════════════════════════════════════════════
-- 0039 — Bir koç, birden çok öğrenci (öğrenciler birbirini görmez)
--
-- Geri alma: 0039_multi_student.down.sql
--
-- Sorun: koçun planlama verisi koçun `user_id`'sinde duruyordu ve
-- öğrenci "koçumun HER görevini" okuyordu (0028). İkinci öğrenci
-- bağlanınca iki öğrenci aynı listeyi görür, birbirinin görevini
-- işaretlerdi.
--
-- Çözüm: öğrenciye ait olan her satır `student_id` taşır.
--   tasks, plan_goals, week_goals, period_notes   ← bu migration ekler
--   sources, plan_batches, routines, gap_items,
--   task_results, daily_logs, coach_notes         ← zaten vardı
-- `goal_nodes` sütun almaz: aylık/haftalık hedefin ALTINDA yaşar,
-- ebeveyn üzerinden süzülür. `categories`, `task_actions`, `topics`,
-- koçun kendi `day_notes` / `entries` / kişisel rutinleri ORTAK kalır.
--
-- Yeni satırın öğrencisi (`scope_student` trigger'ı):
--   1. Satırda açıkça verildiyse o.
--   2. Yoksa isteğin `x-kero-student` başlığı (tarayıcı, koçun o
--      cihazda seçtiği öğrenciyi her isteğe ekler).
--   3. Yoksa koçun TEK öğrencisi varsa o; hiç yoksa null.
--   4. Birden çok öğrenci var ve seçim gelmediyse HATA — satır
--      sessizce yanlış öğrenciye düşmesin.
-- Her durumda öğrencinin satır sahibinin (koçun) öğrencisi olduğu
-- doğrulanır.
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────── Sütunlar ─────────────────────────────
alter table public.tasks
  add column if not exists student_id uuid references auth.users (id) on delete cascade;
alter table public.plan_goals
  add column if not exists student_id uuid references auth.users (id) on delete cascade;
alter table public.week_goals
  add column if not exists student_id uuid references auth.users (id) on delete cascade;
alter table public.period_notes
  add column if not exists student_id uuid references auth.users (id) on delete cascade;

create index if not exists tasks_student_idx      on public.tasks (student_id);
create index if not exists plan_goals_student_idx on public.plan_goals (student_id);
create index if not exists week_goals_student_idx on public.week_goals (student_id);
create index if not exists plan_batches_student_idx on public.plan_batches (student_id);

-- period_notes: dönem başına tek satır artık ÖĞRENCİ başına.
-- NULLS NOT DISTINCT: öğrencisi olmayan koçta da tek satır kalsın.
alter table public.period_notes drop constraint if exists period_notes_pkey;
alter table public.period_notes drop constraint if exists period_notes_owner_period_key;
alter table public.period_notes add constraint period_notes_owner_period_key
  unique nulls not distinct (user_id, student_id, scale, period_start);

-- ───────────────────────────── Yardımcılar ──────────────────────────
-- Koçun ilk öğrencisi (0034'teki backfill ile aynı sıra).
create or replace function public.first_student_of(coach uuid)
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select p.user_id from public.profiles p
   where p.coach_id = coach and p.role = 'student'
   order by p.created_at, p.user_id
   limit 1;
$$;

create or replace function public.is_student_of(student uuid, coach uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
     where p.user_id = student and p.coach_id = coach and p.role = 'student'
  );
$$;

-- İsteğin `x-kero-student` başlığı (PostgREST `request.headers`).
create or replace function public.request_student()
returns uuid
language plpgsql stable
set search_path = ''
as $$
declare
  raw text := current_setting('request.headers', true);
begin
  if raw is null or raw = '' then return null; end if;
  return (raw::json ->> 'x-kero-student')::uuid;
exception when others then
  return null;
end;
$$;

revoke all on function public.first_student_of(uuid) from public, anon;
revoke all on function public.is_student_of(uuid, uuid) from public, anon;
revoke all on function public.request_student() from public, anon;
grant execute on function public.first_student_of(uuid) to authenticated;
grant execute on function public.is_student_of(uuid, uuid) to authenticated;
grant execute on function public.request_student() to authenticated;

-- ───────────────────────────── Backfill ─────────────────────────────
-- Bugüne kadar öğrenci koçun HER şeyini görüyordu; aynı görünüm
-- korunur: her şey koçun (ilk) öğrencisine. Rutin görevleri rutinin
-- öğrencisine, öğrencinin eski "ek çalışma"ları kendisine.
update public.tasks t
   set student_id = r.student_id
  from public.routines r
 where t.routine_id = r.id and r.student_id is not null and t.student_id is null;

update public.tasks t
   set student_id = t.created_by
 where t.student_id is null
   and t.created_by is not null
   and public.is_student_of(t.created_by, t.user_id);

update public.tasks        set student_id = public.first_student_of(user_id)  where student_id is null;
update public.plan_goals   set student_id = public.first_student_of(user_id)  where student_id is null;
update public.week_goals   set student_id = public.first_student_of(user_id)  where student_id is null;
update public.period_notes set student_id = public.first_student_of(user_id)  where student_id is null;
update public.sources      set student_id = public.first_student_of(coach_id) where student_id is null;
update public.plan_batches set student_id = public.first_student_of(coach_id) where student_id is null;

-- ───────────────────────── Öğrenci damgası ──────────────────────────
-- tg_argv[0]: satır sahibinin (koçun) sütunu — 'user_id' / 'coach_id'.
-- Adı `zz_` ile başlar: aynı anda tetiklenen trigger'lar ada göre
-- sıralanır, sahip damgası (`*_stamp*`) önce çalışmış olmalı.
create or replace function public.scope_student()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  owner uuid := (to_jsonb(new) ->> tg_argv[0])::uuid;
  wanted uuid;
  n int;
begin
  if tg_op = 'INSERT' and new.student_id is null and owner is not null then
    wanted := public.request_student();
    if wanted is not null and public.is_student_of(wanted, owner) then
      new.student_id := wanted;
    else
      select count(*) into n from public.profiles p
       where p.coach_id = owner and p.role = 'student';
      if n = 1 then
        new.student_id := public.first_student_of(owner);
      elsif n > 1 then
        raise exception 'Öğrenci seçilmedi: kaydın hangi öğrenciye ait olduğu belli değil'
          using errcode = '23514';
      end if;
    end if;
  end if;

  if new.student_id is not null and not public.is_student_of(new.student_id, owner) then
    raise exception 'Bu öğrenci bu koça bağlı değil' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists zz_tasks_scope_student on public.tasks;
create trigger zz_tasks_scope_student
  before insert or update of student_id on public.tasks
  for each row execute function public.scope_student('user_id');

drop trigger if exists zz_plan_goals_scope_student on public.plan_goals;
create trigger zz_plan_goals_scope_student
  before insert or update of student_id on public.plan_goals
  for each row execute function public.scope_student('user_id');

drop trigger if exists zz_week_goals_scope_student on public.week_goals;
create trigger zz_week_goals_scope_student
  before insert or update of student_id on public.week_goals
  for each row execute function public.scope_student('user_id');

drop trigger if exists zz_period_notes_scope_student on public.period_notes;
create trigger zz_period_notes_scope_student
  before insert or update of student_id on public.period_notes
  for each row execute function public.scope_student('user_id');

drop trigger if exists zz_sources_scope_student on public.sources;
create trigger zz_sources_scope_student
  before insert or update of student_id on public.sources
  for each row execute function public.scope_student('coach_id');

drop trigger if exists zz_plan_batches_scope_student on public.plan_batches;
create trigger zz_plan_batches_scope_student
  before insert or update of student_id on public.plan_batches
  for each row execute function public.scope_student('coach_id');

-- ───────────────── Öğrenci yalnızca KENDİ satırlarını okur ───────────
drop policy if exists tasks_student_select on public.tasks;
create policy tasks_student_select on public.tasks
  for select to authenticated
  using (student_id = (select auth.uid()));

-- Sonuç yalnızca kendi görevine yazılır.
drop policy if exists task_results_insert on public.task_results;
create policy task_results_insert on public.task_results
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1 from public.tasks t
       where t.id = task_id and t.student_id = (select auth.uid())
    )
  );

drop policy if exists sources_select on public.sources;
create policy sources_select on public.sources
  for select to authenticated
  using (coach_id = (select auth.uid()) or student_id = (select auth.uid()));

drop policy if exists plan_batches_select on public.plan_batches;
create policy plan_batches_select on public.plan_batches
  for select to authenticated
  using (coach_id = (select auth.uid()) or student_id = (select auth.uid()));

-- Kaynak ağacı: koçun yardımcılarının (0034/0036) öğrenci ikizleri.
create or replace function public.source_student(sid uuid)
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select s.student_id from public.sources s where s.id = sid;
$$;

create or replace function public.series_student(series uuid)
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select s.student_id
    from public.source_series se
    join public.sources s on s.id = se.source_id
   where se.id = series;
$$;

create or replace function public.section_student(section uuid)
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select s.student_id
    from public.source_sections sc
    join public.source_series se on se.id = sc.series_id
    join public.sources s on s.id = se.source_id
   where sc.id = section;
$$;

create or replace function public.item_student(item uuid)
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select public.section_student(i.section_id) from public.source_items i where i.id = item;
$$;

create or replace function public.task_student(tid uuid)
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select t.student_id from public.tasks t where t.id = tid;
$$;

revoke all on function public.source_student(uuid)  from public, anon;
revoke all on function public.series_student(uuid)  from public, anon;
revoke all on function public.section_student(uuid) from public, anon;
revoke all on function public.item_student(uuid)    from public, anon;
revoke all on function public.task_student(uuid)    from public, anon;
grant execute on function public.source_student(uuid)  to authenticated;
grant execute on function public.series_student(uuid)  to authenticated;
grant execute on function public.section_student(uuid) to authenticated;
grant execute on function public.item_student(uuid)    to authenticated;
grant execute on function public.task_student(uuid)    to authenticated;

drop policy if exists source_series_select on public.source_series;
create policy source_series_select on public.source_series
  for select to authenticated
  using (
    public.source_coach(source_id) = (select auth.uid())
    or public.source_student(source_id) = (select auth.uid())
  );

drop policy if exists source_sections_select on public.source_sections;
create policy source_sections_select on public.source_sections
  for select to authenticated
  using (
    public.series_coach(series_id) = (select auth.uid())
    or public.series_student(series_id) = (select auth.uid())
  );

drop policy if exists source_items_select on public.source_items;
create policy source_items_select on public.source_items
  for select to authenticated
  using (
    public.section_coach(section_id) = (select auth.uid())
    or public.section_student(section_id) = (select auth.uid())
  );

drop policy if exists source_item_marks_select on public.source_item_marks;
create policy source_item_marks_select on public.source_item_marks
  for select to authenticated
  using (
    public.item_coach(item_id) = (select auth.uid())
    or public.item_student(item_id) = (select auth.uid())
  );

drop policy if exists source_range_marks_select on public.source_range_marks;
create policy source_range_marks_select on public.source_range_marks
  for select to authenticated
  using (
    public.section_coach(section_id) = (select auth.uid())
    or public.section_student(section_id) = (select auth.uid())
  );

drop policy if exists task_items_select on public.task_items;
create policy task_items_select on public.task_items
  for select to authenticated
  using (
    public.task_owner(task_id) = (select auth.uid())
    or public.task_student(task_id) = (select auth.uid())
  );

-- ─────────────── Rutin görevleri rutinin öğrencisine ────────────────
-- 0037'deki gövde; tek fark INSERT'te `student_id`.
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

    insert into public.tasks (user_id, created_by, student_id, title, due_date, routine_id, estimate_minutes, action)
    values (r.user_id, me, r.student_id, 'Rutin | ' || r.name, d, r.id, r.estimate_minutes, 'Rutin')
    on conflict (routine_id, due_date) where routine_id is not null do nothing;
    get diagnostics n = row_count;
    added := added + n;
  end loop;

  return added;
end;
$$;

revoke all on function public.insert_routine_tasks(jsonb) from public, anon;
grant execute on function public.insert_routine_tasks(jsonb) to authenticated;

-- ─────────────────── link_student: ilk öğrenci devralır ─────────────
-- Öğrencisi olmayan koçun planı `student_id = null` durur. İLK öğrenci
-- bağlanınca o plan ona geçer (eski davranış: öğrenci koçun her şeyini
-- görürdü). İkinci öğrenci boş bir sayfayla başlar.
create or replace function public.link_student(student_email text, coach_email text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  s uuid;
  c uuid;
  n int;
begin
  select id into s from auth.users where lower(email) = lower(trim(student_email));
  select id into c from auth.users where lower(email) = lower(trim(coach_email));
  if s is null then raise exception 'Öğrenci hesabı bulunamadı: %', student_email; end if;
  if c is null then raise exception 'Koç hesabı bulunamadı: %', coach_email; end if;
  if s = c then raise exception 'Öğrenci ve koç aynı hesap olamaz'; end if;

  insert into public.profiles (user_id, role, coach_id)
  values (s, 'student', c)
  on conflict (user_id) do update set role = 'student', coach_id = excluded.coach_id;

  select count(*) into n from public.profiles p where p.coach_id = c and p.role = 'student';
  if n = 1 then
    update public.tasks        set student_id = s where user_id  = c and student_id is null;
    update public.plan_goals   set student_id = s where user_id  = c and student_id is null;
    update public.week_goals   set student_id = s where user_id  = c and student_id is null;
    update public.period_notes set student_id = s where user_id  = c and student_id is null;
    update public.sources      set student_id = s where coach_id = c and student_id is null;
    update public.plan_batches set student_id = s where coach_id = c and student_id is null;
  end if;

  return format('Bağlandı (koçun %s öğrencisi var). Öğrenci çıkış yapıp yeniden girmeli.', n);
end;
$$;

revoke all on function public.link_student(text, text) from public, anon, authenticated;
