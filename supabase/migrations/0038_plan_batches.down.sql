-- 0038 GERİ ALMA — dağıtım kayıtları silinir; görevler KALIR
-- (tasks.plan_batch_id değerleri durur, FK düşer).
alter table public.tasks drop constraint if exists tasks_plan_batch_fk;
drop table if exists public.plan_batches cascade;
