-- ═══════════════════════════════════════════════════════════════════
-- 0034 — Kaynak ağacı: Kaynak → Seri → Bölüm → Birim
--
-- YALNIZCA EKLEME. Geri alma: 0034_source_tree.down.sql
--
-- `sources` (0029) GENİŞLER, yeni kaynak tablosu açılmaz.
--
--   sources          kitap / video kursu
--   source_series    kitabın içindeki test serileri: Konu Testleri,
--                    ÖSYM Tipi, Sarmal, Simülasyon… Serisiz kitapta
--                    tek bir 'konu' serisi.
--   source_sections  içindekiler satırı: "Basit Harmonik Hareket | 39-46"
--   source_items     unit='test' kaynaklarda HER TEST ayrı satır. ÖSYM
--                    Tipi gibi serilerde konu item düzeyinde tutulur.
--   topics           ders bazlı ORTAK konu listesi; farklı kitaplardaki
--                    aynı konu burada birleşir (seed: 0035).
--   task_items       görev ↔ test (bir görev birden çok teste bağlanır).
--   task_actions     koçun eklediği özel eylemler ("Çöz", "İzle"… kodda).
--
-- Görev ↔ kaynak bağı YALNIZCA görev katalogdan oluşturulunca kurulur.
-- Test birimli kaynakta bağ `task_items`; soru/sayfa/ders birimlerinde
-- `tasks.section_id + range_from/range_to`.
--
-- İlerlet görevinde `range_from` = başlangıç, `range_to` = başlangıç +
-- hedef − 1 (REZERVASYON); gerçek ilerleme `task_results.reached_to`.
-- Böylece 0029'daki `tasks_range_valid` kısıtı değişmez.
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────── sources ──────────────────────────────
alter table public.sources
  add column if not exists student_id uuid references auth.users (id) on delete cascade,
  add column if not exists kind text not null default 'kitap',
  add column if not exists publisher text,
  add column if not exists exam text,
  add column if not exists level text,
  add column if not exists minutes_per_unit numeric,
  add column if not exists status text not null default 'sirada';

alter table public.sources drop constraint if exists sources_kind_check;
alter table public.sources add constraint sources_kind_check check (kind in ('kitap', 'video'));
alter table public.sources drop constraint if exists sources_publisher_check;
alter table public.sources add constraint sources_publisher_check
  check (publisher is null or length(publisher) <= 80);
alter table public.sources drop constraint if exists sources_exam_check;
alter table public.sources add constraint sources_exam_check
  check (exam is null or exam in ('TYT', 'AYT', 'LGS'));
alter table public.sources drop constraint if exists sources_level_check;
alter table public.sources add constraint sources_level_check
  check (level is null or level in ('temel', 'orta', 'ileri'));
alter table public.sources drop constraint if exists sources_minutes_per_unit_check;
alter table public.sources add constraint sources_minutes_per_unit_check
  check (minutes_per_unit is null or (minutes_per_unit > 0 and minutes_per_unit <= 600));
alter table public.sources drop constraint if exists sources_status_check;
alter table public.sources add constraint sources_status_check
  check (status in ('sirada', 'devam', 'bitti'));

-- Birim: video kursları için 'ders' eklenir (yalnızca GEVŞETME).
alter table public.sources drop constraint if exists sources_unit_check;
alter table public.sources add constraint sources_unit_check
  check (unit in ('test', 'soru', 'sayfa', 'ders'));

create index if not exists sources_student_idx on public.sources (student_id);

-- ────────────────────────────── topics ──────────────────────────────
create table if not exists public.topics (
  id         uuid primary key default gen_random_uuid(),
  subject    text not null check (length(trim(subject)) between 1 and 60),
  exam       text not null check (exam in ('TYT', 'AYT', 'LGS')),
  name       text not null check (length(trim(name)) between 1 and 80),
  aliases    text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (subject, exam, name)
);

create index if not exists topics_subject_idx on public.topics (subject, exam, sort_order);

-- ────────────────────────── source_series ───────────────────────────
create table if not exists public.source_series (
  id         uuid primary key default gen_random_uuid(),
  source_id  uuid not null references public.sources (id) on delete cascade,
  name       text not null check (length(trim(name)) between 1 and 80),
  kind       text not null default 'konu'
             check (kind in ('konu', 'osym', 'sarmal', 'simulasyon', 'diger')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists source_series_source_idx on public.source_series (source_id, sort_order);

-- ───────────────────────── source_sections ──────────────────────────
create table if not exists public.source_sections (
  id         uuid primary key default gen_random_uuid(),
  series_id  uuid not null references public.source_series (id) on delete cascade,
  topic_id   uuid references public.topics (id) on delete set null,
  label      text not null check (length(trim(label)) between 1 and 120),
  unit_from  integer not null,
  unit_to    integer not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint source_sections_range check (unit_from between 1 and unit_to and unit_to <= 100000)
);

create index if not exists source_sections_series_idx on public.source_sections (series_id, sort_order);
create index if not exists source_sections_topic_idx on public.source_sections (topic_id);

-- ─────────────────────────── source_items ───────────────────────────
create table if not exists public.source_items (
  id         uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.source_sections (id) on delete cascade,
  number     integer not null check (number between 1 and 100000),
  -- null → bölümün konusu geçerli. ÖSYM Tipi "7 = Basit Harmonik".
  topic_id   uuid references public.topics (id) on delete set null,
  unique (section_id, number)
);

create index if not exists source_items_topic_idx on public.source_items (topic_id);

-- ─────────────────────────── tasks ekleri ───────────────────────────
alter table public.tasks
  add column if not exists section_id    uuid references public.source_sections (id) on delete set null,
  add column if not exists target_amount integer,
  add column if not exists action        text,
  add column if not exists plan_batch_id uuid,
  add column if not exists routine_id    uuid references public.routines (id) on delete set null;

alter table public.tasks drop constraint if exists tasks_target_amount_check;
alter table public.tasks add constraint tasks_target_amount_check
  check (target_amount is null or target_amount between 1 and 100000);
alter table public.tasks drop constraint if exists tasks_action_check;
alter table public.tasks add constraint tasks_action_check
  check (action is null or length(action) <= 40);

create index if not exists tasks_source_idx on public.tasks (source_id) where source_id is not null;
create index if not exists tasks_section_idx on public.tasks (section_id) where section_id is not null;
create index if not exists tasks_batch_idx on public.tasks (plan_batch_id) where plan_batch_id is not null;

-- ──────────────────────────── task_items ────────────────────────────
create table if not exists public.task_items (
  task_id uuid not null references public.tasks (id) on delete cascade,
  item_id uuid not null references public.source_items (id) on delete cascade,
  primary key (task_id, item_id)
);

create index if not exists task_items_item_idx on public.task_items (item_id);

-- ─────────────────────────── task_actions ───────────────────────────
create table if not exists public.task_actions (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references auth.users (id) on delete cascade,
  label      text not null check (length(trim(label)) between 1 and 40),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (coach_id, label)
);

drop trigger if exists task_actions_stamp on public.task_actions;
create trigger task_actions_stamp
  before insert on public.task_actions
  for each row execute function public.stamp_coach_id();

-- ─────────────────────── task_results ekleri ────────────────────────
alter table public.task_results
  add column if not exists reached_to    integer,
  add column if not exists understanding smallint,
  add column if not exists feynman_note  text,
  -- Birden çok testli görev YARIM kaldığında öğrencinin yaptığı testler.
  add column if not exists done_items    uuid[];

alter table public.task_results drop constraint if exists task_results_reached_to_check;
alter table public.task_results add constraint task_results_reached_to_check
  check (reached_to is null or reached_to between 1 and 100000);
alter table public.task_results drop constraint if exists task_results_understanding_check;
alter table public.task_results add constraint task_results_understanding_check
  check (understanding is null or understanding between 1 and 3);
alter table public.task_results drop constraint if exists task_results_feynman_note_check;
alter table public.task_results add constraint task_results_feynman_note_check
  check (feynman_note is null or length(feynman_note) <= 2000);

-- ─────────────────────────── RLS yardımcıları ───────────────────────
-- security definer: politika içinde zincirleme RLS/özyineleme olmasın.
create or replace function public.source_coach(sid uuid)
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select s.coach_id from public.sources s where s.id = sid;
$$;

create or replace function public.series_coach(series uuid)
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select s.coach_id
    from public.source_series se
    join public.sources s on s.id = se.source_id
   where se.id = series;
$$;

create or replace function public.section_coach(section uuid)
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select s.coach_id
    from public.source_sections sc
    join public.source_series se on se.id = sc.series_id
    join public.sources s on s.id = se.source_id
   where sc.id = section;
$$;

create or replace function public.task_owner(tid uuid)
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select t.user_id from public.tasks t where t.id = tid;
$$;

revoke all on function public.source_coach(uuid) from public, anon;
revoke all on function public.series_coach(uuid) from public, anon;
revoke all on function public.section_coach(uuid) from public, anon;
revoke all on function public.task_owner(uuid) from public, anon;
grant execute on function public.source_coach(uuid) to authenticated;
grant execute on function public.series_coach(uuid) to authenticated;
grant execute on function public.section_coach(uuid) to authenticated;
grant execute on function public.task_owner(uuid) to authenticated;

-- ──────────────────────────────── RLS ───────────────────────────────
alter table public.topics          enable row level security;
alter table public.source_series   enable row level security;
alter table public.source_sections enable row level security;
alter table public.source_items    enable row level security;
alter table public.task_items      enable row level security;
alter table public.task_actions    enable row level security;

-- topics: herkes okur, koç rolü yazar (ortak liste).
drop policy if exists topics_select on public.topics;
create policy topics_select on public.topics
  for select to authenticated using (true);
drop policy if exists topics_write on public.topics;
create policy topics_write on public.topics
  for all to authenticated
  using ((select public.my_role()) = 'coach')
  with check ((select public.my_role()) = 'coach');

-- Seri / bölüm / item: kaynağın koçu yazar, koçun öğrencisi okur.
drop policy if exists source_series_select on public.source_series;
create policy source_series_select on public.source_series
  for select to authenticated
  using (public.source_coach(source_id) in ((select auth.uid()), (select public.my_coach_id())));
drop policy if exists source_series_write on public.source_series;
create policy source_series_write on public.source_series
  for all to authenticated
  using (public.source_coach(source_id) = (select auth.uid()))
  with check (public.source_coach(source_id) = (select auth.uid()));

drop policy if exists source_sections_select on public.source_sections;
create policy source_sections_select on public.source_sections
  for select to authenticated
  using (public.series_coach(series_id) in ((select auth.uid()), (select public.my_coach_id())));
drop policy if exists source_sections_write on public.source_sections;
create policy source_sections_write on public.source_sections
  for all to authenticated
  using (public.series_coach(series_id) = (select auth.uid()))
  with check (public.series_coach(series_id) = (select auth.uid()));

drop policy if exists source_items_select on public.source_items;
create policy source_items_select on public.source_items
  for select to authenticated
  using (public.section_coach(section_id) in ((select auth.uid()), (select public.my_coach_id())));
drop policy if exists source_items_write on public.source_items;
create policy source_items_write on public.source_items
  for all to authenticated
  using (public.section_coach(section_id) = (select auth.uid()))
  with check (public.section_coach(section_id) = (select auth.uid()));

-- task_items: görevin sahibi (koç) yazar, öğrencisi okur.
drop policy if exists task_items_select on public.task_items;
create policy task_items_select on public.task_items
  for select to authenticated
  using (public.task_owner(task_id) in ((select auth.uid()), (select public.my_coach_id())));
drop policy if exists task_items_write on public.task_items;
create policy task_items_write on public.task_items
  for all to authenticated
  using (public.task_owner(task_id) = (select auth.uid()) and (select public.my_role()) = 'coach')
  with check (public.task_owner(task_id) = (select auth.uid()) and (select public.my_role()) = 'coach');

-- task_actions: koç yazar, öğrenci okur.
drop policy if exists task_actions_select on public.task_actions;
create policy task_actions_select on public.task_actions
  for select to authenticated
  using (coach_id in ((select auth.uid()), (select public.my_coach_id())));
drop policy if exists task_actions_write on public.task_actions;
create policy task_actions_write on public.task_actions
  for all to authenticated
  using (coach_id = (select auth.uid()) and (select public.my_role()) = 'coach')
  with check (coach_id = (select auth.uid()) and (select public.my_role()) = 'coach');

-- ───────────────────────────── Backfill ─────────────────────────────
-- 1) Kaynağın öğrencisi: koçun (ilk) öğrencisi.
update public.sources s
   set student_id = (
     select p.user_id from public.profiles p
      where p.coach_id = s.coach_id and p.role = 'student'
      order by p.created_at limit 1)
 where s.student_id is null;

-- 2) Ağacı olmayan her mevcut kaynağa: "Konu Testleri" serisi + "Tümü"
--    bölümü (1..total_tests); test birimliyse her test bir item.
do $$
declare
  src record;
  ser uuid;
  sec uuid;
begin
  for src in
    select s.* from public.sources s
     where not exists (select 1 from public.source_series x where x.source_id = s.id)
  loop
    insert into public.source_series (source_id, name, kind)
    values (src.id, 'Konu Testleri', 'konu') returning id into ser;

    insert into public.source_sections (series_id, label, unit_from, unit_to)
    values (ser, 'Tümü', 1, src.total_tests) returning id into sec;

    if src.unit = 'test' then
      insert into public.source_items (section_id, number)
      select sec, n from generate_series(1, src.total_tests) n;
    end if;

    -- 0029'da ELLE bağlanmış görevler bağını korur.
    update public.tasks t set section_id = sec
     where t.source_id = src.id and t.section_id is null;

    if src.unit = 'test' then
      insert into public.task_items (task_id, item_id)
      select t.id, i.id
        from public.tasks t
        join public.source_items i
          on i.section_id = sec and i.number between t.range_from and t.range_to
       where t.source_id = src.id and t.range_from is not null
      on conflict do nothing;
    end if;
  end loop;
end $$;

-- 3) Bağlı görevi olan kaynak "devam".
update public.sources s set status = 'devam'
 where s.status = 'sirada'
   and exists (select 1 from public.tasks t where t.source_id = s.id);
