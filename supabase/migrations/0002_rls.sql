-- ═══════════════════════════════════════════════════════════════════
-- 0002 — Row Level Security
--
-- Bu uygulamada RLS TEK güvenlik katmanıdır: istemci doğrudan
-- Postgres ile konuşur, araya kendi API katmanımız girmez. Politika
-- yanlışsa veri açıktır.
--
-- Üç kural her politikada geçerlidir:
--
-- 1. `(select auth.uid())` — alt sorgu formu. Çıplak `auth.uid()`
--    satır başına bir kez çalışır; alt sorgu formunda planlayıcı bunu
--    InitPlan'a çevirir ve ifade başına bir kez değerlendirir.
--
-- 2. `to authenticated` — kapsam. Aksi halde politika her istekte
--    `anon` rolü için de değerlendirilir.
--
-- 3. INSERT ve UPDATE'te `with check` — bunsuz bir satır güncellenip
--    sahipliği başka bir kullanıcıya devredilebilir.
-- ═══════════════════════════════════════════════════════════════════

alter table public.routines          enable row level security;
alter table public.routine_schedules enable row level security;
alter table public.entries           enable row level security;
alter table public.tasks             enable row level security;
alter table public.day_notes         enable row level security;

-- ───────────────────────────── routines ─────────────────────────────
create policy routines_select on public.routines
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy routines_insert on public.routines
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy routines_update on public.routines
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy routines_delete on public.routines
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ───────────────────────── routine_schedules ────────────────────────
-- user_id burada denormalizedir. Alternatif — routines'e alt sorgu ile
-- bakmak — RLS'i satır başına bir JOIN'e çevirirdi. Doğru değeri
-- 0003'teki trigger garanti eder, istemci belirleyemez.
create policy routine_schedules_select on public.routine_schedules
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy routine_schedules_insert on public.routine_schedules
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy routine_schedules_update on public.routine_schedules
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy routine_schedules_delete on public.routine_schedules
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ────────────────────────────── entries ─────────────────────────────
create policy entries_select on public.entries
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy entries_insert on public.entries
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy entries_update on public.entries
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy entries_delete on public.entries
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ─────────────────────────────── tasks ──────────────────────────────
create policy tasks_select on public.tasks
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy tasks_insert on public.tasks
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy tasks_update on public.tasks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy tasks_delete on public.tasks
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ───────────────────────────── day_notes ────────────────────────────
create policy day_notes_select on public.day_notes
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy day_notes_insert on public.day_notes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy day_notes_update on public.day_notes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy day_notes_delete on public.day_notes
  for delete to authenticated
  using ((select auth.uid()) = user_id);
