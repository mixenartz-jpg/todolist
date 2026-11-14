-- ═══════════════════════════════════════════════════════════════════
-- 0038 — Dağıtımlar (toplu planlama)
--
-- YALNIZCA EKLEME. Geri alma: 0038_plan_batches.down.sql
--
-- "Dağıt" ile tek seferde oluşturulan görevler aynı `plan_batch_id`'yi
-- taşır (0034'te açılan sütun; burada FK bağlanır). Kayıt, Kaydır'ın
-- atlanan hafta günlerini hatırlaması ve listede gösterim içindir.
-- Dağıtımı sil / Kaydır yalnızca sonucu GİRİLMEMİŞ görevlere dokunur
-- (istemci kuralı; sonuçlu görev zaten öğrencinin kaydıdır).
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.plan_batches (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references auth.users (id) on delete cascade,
  student_id    uuid references auth.users (id) on delete cascade,
  label         text not null check (length(trim(label)) between 1 and 160),
  topic_id      uuid references public.topics (id) on delete set null,
  source_id     uuid references public.sources (id) on delete set null,
  series_id     uuid references public.source_series (id) on delete set null,
  skip_weekdays smallint[] not null default '{}',
  created_at    timestamptz not null default now()
);

create index if not exists plan_batches_coach_idx on public.plan_batches (coach_id, created_at desc);

drop trigger if exists plan_batches_stamp on public.plan_batches;
create trigger plan_batches_stamp
  before insert on public.plan_batches
  for each row execute function public.stamp_coach_id();

-- Geri alınıp yeniden çalıştırılırsa yetim kalan bağlar FK'yı bozmasın.
update public.tasks t set plan_batch_id = null
 where t.plan_batch_id is not null
   and not exists (select 1 from public.plan_batches b where b.id = t.plan_batch_id);

alter table public.tasks drop constraint if exists tasks_plan_batch_fk;
alter table public.tasks add constraint tasks_plan_batch_fk
  foreign key (plan_batch_id) references public.plan_batches (id) on delete set null;

alter table public.plan_batches enable row level security;

drop policy if exists plan_batches_select on public.plan_batches;
create policy plan_batches_select on public.plan_batches
  for select to authenticated
  using (coach_id in ((select auth.uid()), (select public.my_coach_id())));

drop policy if exists plan_batches_write on public.plan_batches;
create policy plan_batches_write on public.plan_batches
  for all to authenticated
  using (coach_id = (select auth.uid()) and (select public.my_role()) = 'coach')
  with check (coach_id = (select auth.uid()) and (select public.my_role()) = 'coach');
