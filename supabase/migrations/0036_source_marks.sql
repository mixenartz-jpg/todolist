-- ═══════════════════════════════════════════════════════════════════
-- 0036 — Elle işaretler: "ödevlendirildi" / "çözüldü"
--
-- YALNIZCA EKLEME. Geri alma: 0036_source_marks.down.sql
--
-- Sisteme girmeden önce çözülmüş ya da başka yoldan verilmiş işler
-- için. Görev sonucu HER ZAMAN elle işaretten önceliklidir; birimin
-- rengi istemcide türetilir (features/sources/unitStatus.ts), burada
-- yalnızca işaretin kendisi durur.
--
--   source_item_marks   test birimli kaynaklar: test başına bir işaret
--   source_range_marks  soru/sayfa/ders: bölüm içinde aralık işaretleri
--                       (çakışmaz; istemci bölerek yazar)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.source_item_marks (
  item_id   uuid primary key references public.source_items (id) on delete cascade,
  status    text not null check (status in ('assigned', 'done')),
  marked_at timestamptz not null default now(),
  note      text check (note is null or length(note) <= 500)
);

create table if not exists public.source_range_marks (
  id         uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.source_sections (id) on delete cascade,
  unit_from  integer not null,
  unit_to    integer not null,
  status     text not null check (status in ('assigned', 'done')),
  marked_at  timestamptz not null default now(),
  note       text check (note is null or length(note) <= 500),
  constraint source_range_marks_range check (unit_from between 1 and unit_to)
);

create index if not exists source_range_marks_section_idx on public.source_range_marks (section_id);

create or replace function public.item_coach(item uuid)
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select public.section_coach(i.section_id) from public.source_items i where i.id = item;
$$;

revoke all on function public.item_coach(uuid) from public, anon;
grant execute on function public.item_coach(uuid) to authenticated;

alter table public.source_item_marks  enable row level security;
alter table public.source_range_marks enable row level security;

drop policy if exists source_item_marks_select on public.source_item_marks;
create policy source_item_marks_select on public.source_item_marks
  for select to authenticated
  using (public.item_coach(item_id) in ((select auth.uid()), (select public.my_coach_id())));
drop policy if exists source_item_marks_write on public.source_item_marks;
create policy source_item_marks_write on public.source_item_marks
  for all to authenticated
  using (public.item_coach(item_id) = (select auth.uid()))
  with check (public.item_coach(item_id) = (select auth.uid()));

drop policy if exists source_range_marks_select on public.source_range_marks;
create policy source_range_marks_select on public.source_range_marks
  for select to authenticated
  using (public.section_coach(section_id) in ((select auth.uid()), (select public.my_coach_id())));
drop policy if exists source_range_marks_write on public.source_range_marks;
create policy source_range_marks_write on public.source_range_marks
  for all to authenticated
  using (public.section_coach(section_id) = (select auth.uid()))
  with check (public.section_coach(section_id) = (select auth.uid()));
