-- ═══════════════════════════════════════════════════════════════════
-- 0034 GERİ ALMA — kaynak ağacı kaldırılır.
--
-- DİKKAT: seriler, bölümler, test kutucukları, görev↔test bağları ve
-- koçun özel eylemleri SİLİNİR. Görevler ve sonuçlar KALIR (yalnızca
-- eklenen sütunlar düşer). 'ders' birimli kaynak varsa birim kısıtı
-- geri yüklenemez — önce o kaynakları 'sayfa'ya çevir ya da sil.
-- ═══════════════════════════════════════════════════════════════════

drop table if exists public.task_items cascade;
drop table if exists public.task_actions cascade;

alter table public.task_results
  drop constraint if exists task_results_reached_to_check,
  drop constraint if exists task_results_understanding_check,
  drop constraint if exists task_results_feynman_note_check,
  drop column if exists done_items,
  drop column if exists feynman_note,
  drop column if exists understanding,
  drop column if exists reached_to;

drop index if exists public.tasks_source_idx;
drop index if exists public.tasks_section_idx;
drop index if exists public.tasks_batch_idx;
alter table public.tasks
  drop constraint if exists tasks_target_amount_check,
  drop constraint if exists tasks_action_check,
  drop column if exists routine_id,
  drop column if exists plan_batch_id,
  drop column if exists action,
  drop column if exists target_amount,
  drop column if exists section_id;

drop table if exists public.source_items cascade;
drop table if exists public.source_sections cascade;
drop table if exists public.source_series cascade;
drop table if exists public.topics cascade;

drop function if exists public.task_owner(uuid);
drop function if exists public.section_coach(uuid);
drop function if exists public.series_coach(uuid);
drop function if exists public.source_coach(uuid);

drop index if exists public.sources_student_idx;
alter table public.sources
  drop constraint if exists sources_kind_check,
  drop constraint if exists sources_publisher_check,
  drop constraint if exists sources_exam_check,
  drop constraint if exists sources_level_check,
  drop constraint if exists sources_minutes_per_unit_check,
  drop constraint if exists sources_status_check,
  drop constraint if exists sources_unit_check;
alter table public.sources add constraint sources_unit_check
  check (unit in ('test', 'soru', 'sayfa'));
alter table public.sources
  drop column if exists status,
  drop column if exists minutes_per_unit,
  drop column if exists level,
  drop column if exists exam,
  drop column if exists publisher,
  drop column if exists kind,
  drop column if exists student_id;
