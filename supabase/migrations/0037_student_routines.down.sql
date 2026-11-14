-- 0037 GERİ ALMA — öğrenci rutinleri kaldırılır.
-- DİKKAT: öğrenci rutinleri koçun kişisel rutinlerine DÖNÜŞÜR (student_id
-- düşer) — önce silmek istersen:
--   delete from public.routines where student_id is not null;
-- Üretilmiş görevler ve sonuçları KALIR.
drop function if exists public.insert_routine_tasks(jsonb);
drop policy if exists routine_schedules_student_select on public.routine_schedules;
drop policy if exists routines_student_select on public.routines;
drop index if exists public.tasks_routine_day_uniq;
drop index if exists public.routines_student_idx;
alter table public.routines
  drop constraint if exists routines_estimate_minutes_check,
  drop column if exists estimate_minutes,
  drop column if exists student_id;
