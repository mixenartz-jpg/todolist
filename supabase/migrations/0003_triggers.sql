-- ═══════════════════════════════════════════════════════════════════
-- 0003 — Trigger'lar
--
-- İstemcinin `user_id` göndermesi gerekmez ve gönderemez de: değer
-- sunucuda oturumdan damgalanır. RLS'in `with check` ifadesi yanlış
-- değeri zaten reddederdi, ama yanlış değerin hiç oluşamaması daha
-- iyidir.
-- ═══════════════════════════════════════════════════════════════════

-- ────────────────── user_id'yi oturumdan damgala ────────────────────
create or replace function public.stamp_user_id()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

create trigger routines_stamp_user_id
  before insert on public.routines
  for each row execute function public.stamp_user_id();

create trigger entries_stamp_user_id
  before insert on public.entries
  for each row execute function public.stamp_user_id();

create trigger tasks_stamp_user_id
  before insert on public.tasks
  for each row execute function public.stamp_user_id();

create trigger day_notes_stamp_user_id
  before insert on public.day_notes
  for each row execute function public.stamp_user_id();

-- ──────────── program satırının sahibini rutinden devral ────────────
-- routine_schedules'ın sahibi, bağlı olduğu rutinin sahibi olmalıdır.
-- Oturumdan damgalamak yeterli olurdu, ama rutinden okumak
-- tutarsızlığı yapısal olarak imkânsız kılar.
create or replace function public.stamp_schedule_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner uuid;
begin
  select r.user_id into owner
  from public.routines r
  where r.id = new.routine_id;

  if owner is null then
    raise exception 'Rutin bulunamadı: %', new.routine_id;
  end if;

  new.user_id := owner;
  return new;
end;
$$;

create trigger routine_schedules_stamp_owner
  before insert on public.routine_schedules
  for each row execute function public.stamp_schedule_owner();

-- ───────────────────────── updated_at bakımı ────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger entries_touch_updated_at
  before update on public.entries
  for each row execute function public.touch_updated_at();

create trigger day_notes_touch_updated_at
  before update on public.day_notes
  for each row execute function public.touch_updated_at();

-- ──────────────── her rutin bir programla doğar ─────────────────────
-- Programsız bir rutin anlamsızdır: hiçbir gün zorunlu olmaz, matriste
-- boş bir satır olarak durur. Rutin oluşturulurken program satırı
-- verilmezse, varsayılan olarak "her gün" yazılır.
create or replace function public.ensure_initial_schedule()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.routine_schedules (routine_id, user_id, effective_from, schedule)
  values (new.id, new.user_id, new.start_date, '{"kind":"daily"}'::jsonb)
  on conflict (routine_id, effective_from) do nothing;
  return new;
end;
$$;

create trigger routines_ensure_initial_schedule
  after insert on public.routines
  for each row execute function public.ensure_initial_schedule();
