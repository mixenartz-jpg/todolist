-- ═══════════════════════════════════════════════════════════════════
-- 0030 — Eksik konu havuzu
--
-- YALNIZCA EKLEME. Geri alma: 0030_gap_items.down.sql
--
-- Öğrencinin `task_results.missing_topics`'e yazdığı her konu burada
-- TEK satırda toplanır (öğrenci + normalize konu anahtarı). Koç bir
-- konuyu göreve çevirir → durum 'planned'; o görev tamamlanınca
-- trigger durumu 'closed' yapar. Kapanmış konu yeniden yazılırsa
-- tekrar açılır.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.topic_key(t text)
returns text
language sql immutable
set search_path = ''
as $$
  select regexp_replace(
    lower(translate(trim(t), 'İIıÇŞĞÜÖÂçşğüöâ', 'iiicsguoacsguoa')),
    '\s+', ' ', 'g'
  );
$$;

create table if not exists public.gap_items (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  coach_id   uuid not null references auth.users (id) on delete cascade,
  topic      text not null check (length(trim(topic)) between 1 and 80),
  topic_key  text not null,
  subject    text check (subject is null or length(subject) <= 60),
  first_seen date not null,
  last_seen  date not null,
  count      integer not null default 1 check (count >= 1),
  status     text not null default 'open' check (status in ('open', 'planned', 'closed')),
  task_id    uuid references public.tasks (id) on delete set null,
  closed_at  timestamptz,
  created_at timestamptz not null default now(),

  unique (student_id, topic_key)
);

create index if not exists gap_items_coach_idx on public.gap_items (coach_id, status, last_seen desc);
create index if not exists gap_items_task_idx on public.gap_items (task_id) where task_id is not null;

-- ── Sonuçtan havuza ──
-- security definer: öğrenci havuza doğrudan yazamaz; yalnızca bu
-- trigger yazar. YENİ eklenen konular sayılır (aynı sonuç tekrar
-- kaydedilince sayaç şişmesin).
create or replace function public.collect_gap_items()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  coach uuid;
  subj text;
  t text;
  old_keys text[] := '{}';
begin
  select p.coach_id into coach from public.profiles p where p.user_id = new.student_id;
  if coach is null then return new; end if;

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(public.topic_key(x)), '{}') into old_keys
      from unnest(old.missing_topics) x;
  end if;

  select s.subject into subj
    from public.tasks tk join public.sources s on s.id = tk.source_id
   where tk.id = new.task_id;

  foreach t in array new.missing_topics loop
    continue when length(trim(t)) = 0;
    continue when public.topic_key(t) = any(old_keys);

    insert into public.gap_items
      (student_id, coach_id, topic, topic_key, subject, first_seen, last_seen)
    values
      (new.student_id, coach, left(trim(t), 80), public.topic_key(t), subj, new.date, new.date)
    on conflict (student_id, topic_key) do update
      set count     = public.gap_items.count + 1,
          last_seen = greatest(public.gap_items.last_seen, excluded.last_seen),
          first_seen = least(public.gap_items.first_seen, excluded.first_seen),
          subject   = coalesce(public.gap_items.subject, excluded.subject),
          -- Kapanmış konu yeniden yazıldıysa: tekrar açık.
          status    = case when public.gap_items.status = 'closed' then 'open' else public.gap_items.status end,
          task_id   = case when public.gap_items.status = 'closed' then null else public.gap_items.task_id end,
          closed_at = case when public.gap_items.status = 'closed' then null else public.gap_items.closed_at end;
  end loop;

  return new;
end;
$$;

drop trigger if exists task_results_collect_gaps on public.task_results;
create trigger task_results_collect_gaps
  after insert or update of missing_topics on public.task_results
  for each row execute function public.collect_gap_items();

-- ── Görev bitince kapat ──
create or replace function public.close_gap_items_on_done()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.done and not old.done then
    update public.gap_items
       set status = 'closed', closed_at = now()
     where task_id = new.id and status = 'planned';
  elsif old.done and not new.done then
    update public.gap_items
       set status = 'planned', closed_at = null
     where task_id = new.id and status = 'closed';
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_close_gap_items on public.tasks;
create trigger tasks_close_gap_items
  after update of done on public.tasks
  for each row execute function public.close_gap_items_on_done();

-- ── RLS ──
alter table public.gap_items enable row level security;

drop policy if exists gap_items_select on public.gap_items;
create policy gap_items_select on public.gap_items
  for select to authenticated
  using (coach_id = (select auth.uid()) or student_id = (select auth.uid()));

-- Koç elle konu ekleyebilir ve durumu/göreve bağlamayı yönetir.
drop policy if exists gap_items_insert on public.gap_items;
create policy gap_items_insert on public.gap_items
  for insert to authenticated
  with check (coach_id = (select auth.uid()) and (select public.is_my_student(student_id)));

drop policy if exists gap_items_update on public.gap_items;
create policy gap_items_update on public.gap_items
  for update to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()) and (select public.is_my_student(student_id)));

drop policy if exists gap_items_delete on public.gap_items;
create policy gap_items_delete on public.gap_items
  for delete to authenticated
  using (coach_id = (select auth.uid()));
