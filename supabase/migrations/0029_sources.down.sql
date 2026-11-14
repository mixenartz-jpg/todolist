-- 0029 GERİ ALMA — kaynaklar ve görevlerdeki elle bağlama silinir.
alter table public.tasks drop constraint if exists tasks_range_valid;
alter table public.tasks
  drop column if exists range_to,
  drop column if exists range_from,
  drop column if exists source_id;
drop table if exists public.sources cascade;
