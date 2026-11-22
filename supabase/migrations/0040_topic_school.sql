-- ═══════════════════════════════════════════════════════════════════
-- 0040 — Okul nerede: konu başına okulun durumu
--
-- YALNIZCA EKLEME. Geri alma: 0040_topic_school.down.sql
--
-- Koç, okulda hangi konunun işlendiğini öğrenci başına işaretler.
-- Satır YOKSA konu okulda işlenmedi demektir.
--
--   status 'current'  okulda şu an işleniyor
--          'done'     okulda işlendi (covered_on: işlendiği gün)
--
-- Sahiplik diğer öğrenci tablolarıyla aynı: `coach_id` stamp_coach_id
-- (0028) ile, `student_id` scope_student (0039) ile damgalanır.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.topic_school_status (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references auth.users (id) on delete cascade,
  student_id uuid references auth.users (id) on delete cascade,
  topic_id   uuid not null references public.topics (id) on delete cascade,
  status     text not null check (status in ('current', 'done')),
  covered_on date,
  updated_at timestamptz not null default now(),

  constraint topic_school_status_key unique nulls not distinct (coach_id, student_id, topic_id)
);

create index if not exists topic_school_status_student_idx on public.topic_school_status (student_id);

drop trigger if exists topic_school_status_stamp on public.topic_school_status;
create trigger topic_school_status_stamp
  before insert on public.topic_school_status
  for each row execute function public.stamp_coach_id();

-- `zz_`: sahip damgasından SONRA çalışsın (0039'daki sıra kuralı).
drop trigger if exists zz_topic_school_status_scope_student on public.topic_school_status;
create trigger zz_topic_school_status_scope_student
  before insert or update of student_id on public.topic_school_status
  for each row execute function public.scope_student('coach_id');

alter table public.topic_school_status enable row level security;

-- Koç kendi satırlarını okur/yazar; öğrenci yalnızca kendi satırını okur.
drop policy if exists topic_school_status_select on public.topic_school_status;
create policy topic_school_status_select on public.topic_school_status
  for select to authenticated
  using (coach_id = (select auth.uid()) or student_id = (select auth.uid()));

drop policy if exists topic_school_status_write on public.topic_school_status;
create policy topic_school_status_write on public.topic_school_status
  for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));
