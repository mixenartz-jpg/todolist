-- ═══════════════════════════════════════════════════════════════════
-- 0029 — Kaynaklar (kitaplar) ve görev → kaynak bağı
--
-- YALNIZCA EKLEME. Geri alma: 0029_sources.down.sql
--
-- Görev başlığı ("Kafadengi Mat | Üslü Sayılar | 26-33") istemcide
-- ayrıştırılır; bu sütunlar yalnızca koçun ELLE yaptığı bağlamayı
-- tutar. null → başlıktan çıkarılır. Böylece başlık düzeltilince
-- eşleşme de kendiliğinden düzelir.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.sources (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references auth.users (id) on delete cascade,
  title       text not null check (length(trim(title)) between 1 and 120),
  subject     text check (subject is null or length(subject) <= 60),
  total_tests integer not null check (total_tests between 1 and 100000),
  -- Aralıkların birimi: "26-33" test mi, soru mu, sayfa mı.
  unit        text not null default 'test' check (unit in ('test', 'soru', 'sayfa')),
  -- Başlıklarda geçen diğer yazılışlar: "Kafadengi Mat", "KD".
  aliases     text[] not null default '{}',
  sort_order  integer not null default 0,
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists sources_coach_idx on public.sources (coach_id, archived_at nulls first, sort_order);

alter table public.tasks
  add column if not exists source_id uuid references public.sources (id) on delete set null,
  add column if not exists range_from integer,
  add column if not exists range_to integer;

alter table public.tasks drop constraint if exists tasks_range_valid;
alter table public.tasks add constraint tasks_range_valid check (
  (range_from is null and range_to is null)
  or (range_from is not null and range_to is not null and range_from between 1 and range_to)
);

drop trigger if exists sources_stamp on public.sources;
create trigger sources_stamp
  before insert on public.sources
  for each row execute function public.stamp_coach_id();

alter table public.sources enable row level security;

-- Koç kendi kaynaklarını yönetir; öğrenci koçununkileri okur.
drop policy if exists sources_select on public.sources;
create policy sources_select on public.sources
  for select to authenticated
  using (
    coach_id = (select auth.uid())
    or coach_id = (select public.my_coach_id())
  );

drop policy if exists sources_insert on public.sources;
create policy sources_insert on public.sources
  for insert to authenticated
  with check (coach_id = (select auth.uid()) and (select public.my_role()) = 'coach');

drop policy if exists sources_update on public.sources;
create policy sources_update on public.sources
  for update to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

drop policy if exists sources_delete on public.sources;
create policy sources_delete on public.sources
  for delete to authenticated
  using (coach_id = (select auth.uid()));
