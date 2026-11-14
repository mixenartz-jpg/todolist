-- ═══════════════════════════════════════════════════════════════════
-- 0037 — Öğrenci rutinleri: rutin → günlük görev
--
-- YALNIZCA EKLEME. Geri alma: 0037_student_routines.down.sql
--
-- Mevcut `routines` tablosu GENİŞLER, ikinci tablo açılmaz:
--   student_id        dolu → öğrenci rutini (koçun kişisel takibi değil)
--   estimate_minutes  üretilen görevin süresi
-- Hafta günleri `routine_schedules`'tan (daily / weekdays), aktiflik
-- `archived_at`'ten, tarihler mevcut `start_date` / `end_date`'ten gelir.
--
-- Öğrenci rutinleri `entries`'e ve seri istatistiklerine GİRMEZ;
-- tamamlanma görev sonucundan (`task_results`) izlenir. student_id boş
-- rutinler (koçun kendi takibi) eskisi gibi çalışır.
--
-- Üretim idempotent: aynı gün + aynı rutin için TEK görev (kısmi
-- unique index). İstemci hangi günlerin eksik olduğunu hesaplar,
-- `insert_routine_tasks` her çifti SUNUCUDA doğrular ve ekler.
-- ═══════════════════════════════════════════════════════════════════

alter table public.routines
  add column if not exists student_id uuid references auth.users (id) on delete cascade,
  add column if not exists estimate_minutes smallint;

alter table public.routines drop constraint if exists routines_estimate_minutes_check;
alter table public.routines add constraint routines_estimate_minutes_check
  check (estimate_minutes is null or estimate_minutes between 1 and 1440);

create index if not exists routines_student_idx on public.routines (student_id) where student_id is not null;

create unique index if not exists tasks_routine_day_uniq
  on public.tasks (routine_id, due_date) where routine_id is not null;

-- Öğrenci kendi rutinlerini ve programlarını OKUR (koç yazar — 0002).
drop policy if exists routines_student_select on public.routines;
create policy routines_student_select on public.routines
  for select to authenticated
  using (student_id = (select auth.uid()));

drop policy if exists routine_schedules_student_select on public.routine_schedules;
create policy routine_schedules_student_select on public.routine_schedules
  for select to authenticated
  using (exists (
    select 1 from public.routines r
     where r.id = routine_id and r.student_id = (select auth.uid())
  ));

-- ── Rutin görevlerini üret ──
-- p_rows: [{"routine_id": "...", "due_date": "2026-11-15"}, ...]
--
-- Her çift doğrulanır:
--   • rutin bir öğrenci rutini; çağıran ya koçu ya öğrencisi
--   • gün rutinin aktif aralığında, rutin arşivli değil
--   • o günkü program 'daily' ya da gün 'weekdays' içinde;
--     'flexible' yalnızca KOÇ elle eklerse
-- Geçmeyen çift sessizce atlanır. Dönüş: eklenen görev sayısı.
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

revoke all on function public.insert_routine_tasks(jsonb) from public, anon;
grant execute on function public.insert_routine_tasks(jsonb) to authenticated;
