-- 0033 GERİ ALMA — `done_on` ve damgası kaldırılır.
drop trigger if exists task_results_done_on on public.task_results;
drop function if exists public.stamp_done_on();
drop index if exists public.task_results_student_done_on_idx;
alter table public.task_results drop column if exists done_on;
