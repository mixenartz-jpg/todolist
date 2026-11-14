-- ═══════════════════════════════════════════════════════════════════
-- 0028 — Koç / Öğrenci rolleri, görev sonuçları, günlük form, koç notu
--
-- YALNIZCA EKLEME: mevcut hiçbir sütun düşmez, hiçbir satır silinmez.
-- Geri alma: 0028_roles_and_results.down.sql
--
-- ── Güvenlik modeli ──
-- İstemci Postgres'le doğrudan konuşuyor (0002), yani "sunucu tarafı
-- yetki" = RLS + trigger. Öğrenci:
--   • koçunun görevlerini OKUR, plan görevlerini DEĞİŞTİREMEZ;
--   • yalnızca KENDİ eklediği "ek çalışma" görevlerini yazar;
--   • tamamlama durumunu `task_results` üzerinden yazar — `tasks.done`
--     bir trigger ile eşitlenir, öğrenciye `tasks` UPDATE yetkisi
--     verilmez.
-- Koç öğrencinin sonuçlarını ve formunu OKUR, yazamaz; yalnızca
-- `coach_notes` yazar.
--
-- ── Rol JWT'de ──
-- `profiles.role` değişince `auth.users.raw_app_meta_data.role`
-- eşitlenir. Proxy (middleware) rolü token'dan okur — her istekte ek
-- sorgu yok. Rol yalnızca YÖNLENDİRME içindir; yetki RLS'tedir.
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────── profiles ─────────────────────────────
create table if not exists public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  role         text not null default 'coach' check (role in ('coach', 'student')),
  coach_id     uuid references auth.users (id) on delete set null,
  display_name text check (display_name is null or length(display_name) <= 60),
  created_at   timestamptz not null default now(),

  -- Öğrenci bir koça bağlıdır; koçun koçu yoktur.
  constraint profiles_role_coach check (
    (role = 'student' and coach_id is not null)
    or (role = 'coach' and coach_id is null)
  ),
  constraint profiles_not_self_coach check (coach_id is distinct from user_id)
);

create index if not exists profiles_coach_idx on public.profiles (coach_id);

-- Mevcut tüm hesaplar KOÇ olarak başlar.
insert into public.profiles (user_id, role)
select u.id, 'coach' from auth.users u
on conflict (user_id) do nothing;

-- ── Yardımcılar ──
-- security definer: profiles RLS'ine takılmadan, politika içinde
-- özyineleme olmadan okunabilsin diye.
create or replace function public.my_role()
returns text
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select p.role from public.profiles p where p.user_id = (select auth.uid())),
    'coach'
  );
$$;

create or replace function public.my_coach_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select p.coach_id from public.profiles p where p.user_id = (select auth.uid());
$$;

create or replace function public.is_my_student(student uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = student and p.coach_id = (select auth.uid())
  );
$$;

revoke all on function public.my_role() from public, anon;
revoke all on function public.my_coach_id() from public, anon;
revoke all on function public.is_my_student(uuid) from public, anon;
grant execute on function public.my_role() to authenticated;
grant execute on function public.my_coach_id() to authenticated;
grant execute on function public.is_my_student(uuid) to authenticated;

alter table public.profiles enable row level security;

-- Kendi satırım + öğrencilerimin satırı + koçumun satırı. Yazma yok:
-- roller yalnızca SQL Editor'den (`link_student`) değişir.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or coach_id = (select auth.uid())
    or user_id = (select public.my_coach_id())
  );

-- ── Rolü JWT'ye yaz ──
create or replace function public.sync_role_to_jwt()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                             || jsonb_build_object('role', new.role)
   where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists profiles_sync_role on public.profiles;
create trigger profiles_sync_role
  after insert or update of role on public.profiles
  for each row execute function public.sync_role_to_jwt();

-- Mevcut satırlar için bir kez eşitle.
update auth.users u
   set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb)
                           || jsonb_build_object('role', p.role)
  from public.profiles p
 where p.user_id = u.id;

-- Yeni açılan her hesap koç profiliyle doğar; öğrenciye
-- `link_student` çevirir.
create or replace function public.create_profile_for_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, role) values (new.id, 'coach')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists auth_users_create_profile on auth.users;
create trigger auth_users_create_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_user();

-- ── Öğrenciyi koça bağla (YALNIZCA SQL Editor) ──
--   select public.link_student('kardes@ornek.com', 'koc@ornek.com');
create or replace function public.link_student(student_email text, coach_email text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  s uuid;
  c uuid;
begin
  select id into s from auth.users where lower(email) = lower(trim(student_email));
  select id into c from auth.users where lower(email) = lower(trim(coach_email));
  if s is null then raise exception 'Öğrenci hesabı bulunamadı: %', student_email; end if;
  if c is null then raise exception 'Koç hesabı bulunamadı: %', coach_email; end if;
  if s = c then raise exception 'Öğrenci ve koç aynı hesap olamaz'; end if;

  insert into public.profiles (user_id, role, coach_id)
  values (s, 'student', c)
  on conflict (user_id) do update set role = 'student', coach_id = excluded.coach_id;

  return 'Bağlandı. Öğrenci çıkış yapıp yeniden girmeli.';
end;
$$;

revoke all on function public.link_student(text, text) from public, anon, authenticated;

-- ─────────────────────────── tasks eklemeleri ───────────────────────
-- `created_by`: görevi kim yazdı. Öğrencinin "ek çalışma"sı koçun
-- görev listesinde (user_id = koç) yaşar ama `created_by` öğrencidir.
alter table public.tasks
  add column if not exists created_by uuid references auth.users (id) on delete set null;

update public.tasks set created_by = user_id where created_by is null;

-- Görev damgası: koç için eski davranış (user_id = ben). Öğrenci için
-- user_id = KOÇUM, created_by = ben. Paylaşılan `stamp_user_id`'ye
-- dokunulmaz — başka tablolar da onu kullanıyor.
create or replace function public.stamp_task_owner()
returns trigger
language plpgsql security invoker
set search_path = ''
as $$
declare
  coach uuid := public.my_coach_id();
begin
  new.created_by := auth.uid();
  new.user_id := coalesce(coach, auth.uid());
  return new;
end;
$$;

drop trigger if exists tasks_stamp_user_id on public.tasks;
create trigger tasks_stamp_user_id
  before insert on public.tasks
  for each row execute function public.stamp_task_owner();

-- Öğrenci politikaları (koçunkiler 0002'de, aynen duruyor).
drop policy if exists tasks_student_select on public.tasks;
create policy tasks_student_select on public.tasks
  for select to authenticated
  using (user_id = (select public.my_coach_id()));

drop policy if exists tasks_student_insert on public.tasks;
create policy tasks_student_insert on public.tasks
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and user_id = (select public.my_coach_id())
  );

drop policy if exists tasks_student_update on public.tasks;
create policy tasks_student_update on public.tasks
  for update to authenticated
  using (
    created_by = (select auth.uid())
    and user_id = (select public.my_coach_id())
  )
  with check (
    created_by = (select auth.uid())
    and user_id = (select public.my_coach_id())
  );

drop policy if exists tasks_student_delete on public.tasks;
create policy tasks_student_delete on public.tasks
  for delete to authenticated
  using (
    created_by = (select auth.uid())
    and user_id = (select public.my_coach_id())
  );

-- ─────────────────────────── task_results ───────────────────────────
-- Anahtar (task_id, date): yapılmayan görev yarına taşınınca dünkü
-- sonuç EZİLMEZ. "Aynı görev 2+ kez yapılmadı" uyarısı buna dayanır.
create table if not exists public.task_results (
  task_id        uuid not null references public.tasks (id) on delete cascade,
  date           date not null,
  student_id     uuid not null references auth.users (id) on delete cascade,
  -- null → henüz durum seçilmedi (yalnızca not/sayı girilmiş olabilir).
  status         text check (status in ('done', 'partial', 'skipped')),
  total          smallint check (total is null or total between 0 and 1000),
  correct        smallint check (correct is null or correct between 0 and 1000),
  wrong          smallint check (wrong is null or wrong between 0 and 1000),
  empty          smallint check (empty is null or empty between 0 and 1000),
  actual_minutes smallint check (actual_minutes is null or actual_minutes between 0 and 1440),
  missing_topics text[] not null default '{}',
  reason         text check (reason is null or length(reason) <= 500),
  note           text check (note is null or length(note) <= 2000),
  updated_at     timestamptz not null default now(),

  primary key (task_id, date)
);

create index if not exists task_results_student_date_idx
  on public.task_results (student_id, date desc);

-- ──────────────────────────── daily_logs ────────────────────────────
create table if not exists public.daily_logs (
  student_id    uuid not null references auth.users (id) on delete cascade,
  date          date not null,
  sleep_at      time,
  wake_at       time,
  -- Kova indeksleri; etiketleri istemcide (features/student/buckets.ts).
  study_bucket  smallint check (study_bucket is null or study_bucket between 0 and 10),
  screen_bucket smallint check (screen_bucket is null or screen_bucket between 0 and 10),
  energy        smallint check (energy is null or energy between 1 and 5),
  note          text check (note is null or length(note) <= 4000),
  updated_at    timestamptz not null default now(),

  primary key (student_id, date)
);

-- ──────────────────────────── coach_notes ───────────────────────────
-- `scale`: bugün yalnızca 'day'. 'week' sonraki fazın haftalık koç
-- yorumu için şimdiden açık (date = haftanın pazartesisi).
create table if not exists public.coach_notes (
  coach_id   uuid not null references auth.users (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  date       date not null,
  scale      text not null default 'day' check (scale in ('day', 'week')),
  note       text not null check (length(note) <= 4000),
  updated_at timestamptz not null default now(),

  primary key (student_id, date, scale)
);

-- ── Damgalar ──
create or replace function public.stamp_student_id()
returns trigger
language plpgsql security invoker
set search_path = ''
as $$
begin
  new.student_id := auth.uid();
  return new;
end;
$$;

create or replace function public.stamp_coach_id()
returns trigger
language plpgsql security invoker
set search_path = ''
as $$
begin
  new.coach_id := auth.uid();
  return new;
end;
$$;

drop trigger if exists task_results_stamp on public.task_results;
create trigger task_results_stamp
  before insert on public.task_results
  for each row execute function public.stamp_student_id();

drop trigger if exists daily_logs_stamp on public.daily_logs;
create trigger daily_logs_stamp
  before insert on public.daily_logs
  for each row execute function public.stamp_student_id();

drop trigger if exists coach_notes_stamp on public.coach_notes;
create trigger coach_notes_stamp
  before insert on public.coach_notes
  for each row execute function public.stamp_coach_id();

drop trigger if exists task_results_touch on public.task_results;
create trigger task_results_touch
  before update on public.task_results
  for each row execute function public.touch_updated_at();

drop trigger if exists daily_logs_touch on public.daily_logs;
create trigger daily_logs_touch
  before update on public.daily_logs
  for each row execute function public.touch_updated_at();

drop trigger if exists coach_notes_touch on public.coach_notes;
create trigger coach_notes_touch
  before update on public.coach_notes
  for each row execute function public.touch_updated_at();

-- ── Tamamlama eşitlemesi: task_results → tasks.done ──
-- security definer: öğrencinin `tasks` UPDATE yetkisi yok; bu trigger
-- yalnızca `done` ve `completed_at`'e dokunur, başlık/süre DEĞİŞMEZ.
create or replace function public.sync_task_done()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  tid uuid := coalesce(new.task_id, old.task_id);
  is_done boolean;
begin
  select exists (
    select 1 from public.task_results r
    where r.task_id = tid and r.status = 'done'
  ) into is_done;

  update public.tasks t
     set done = is_done,
         completed_at = case
           when is_done and t.completed_at is null then now()
           when not is_done then null
           else t.completed_at
         end
   where t.id = tid and t.done is distinct from is_done;

  return null;
end;
$$;

drop trigger if exists task_results_sync_done on public.task_results;
create trigger task_results_sync_done
  after insert or update of status or delete on public.task_results
  for each row execute function public.sync_task_done();

-- ── RLS ──
alter table public.task_results enable row level security;
alter table public.daily_logs   enable row level security;
alter table public.coach_notes  enable row level security;

-- task_results: öğrenci kendi satırlarını yazar (ve yalnızca koçunun
-- görevlerine); koç öğrencisininkileri OKUR.
drop policy if exists task_results_select on public.task_results;
create policy task_results_select on public.task_results
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.is_my_student(student_id))
  );

drop policy if exists task_results_insert on public.task_results;
create policy task_results_insert on public.task_results
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and t.user_id = (select public.my_coach_id())
    )
  );

drop policy if exists task_results_update on public.task_results;
create policy task_results_update on public.task_results
  for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

drop policy if exists task_results_delete on public.task_results;
create policy task_results_delete on public.task_results
  for delete to authenticated
  using (student_id = (select auth.uid()));

-- daily_logs: aynı desen.
drop policy if exists daily_logs_select on public.daily_logs;
create policy daily_logs_select on public.daily_logs
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.is_my_student(student_id))
  );

drop policy if exists daily_logs_insert on public.daily_logs;
create policy daily_logs_insert on public.daily_logs
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and (select public.my_role()) = 'student'
  );

drop policy if exists daily_logs_update on public.daily_logs;
create policy daily_logs_update on public.daily_logs
  for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

drop policy if exists daily_logs_delete on public.daily_logs;
create policy daily_logs_delete on public.daily_logs
  for delete to authenticated
  using (student_id = (select auth.uid()));

-- coach_notes: koç yazar, öğrenci okur.
drop policy if exists coach_notes_select on public.coach_notes;
create policy coach_notes_select on public.coach_notes
  for select to authenticated
  using (
    coach_id = (select auth.uid())
    or student_id = (select auth.uid())
  );

drop policy if exists coach_notes_insert on public.coach_notes;
create policy coach_notes_insert on public.coach_notes
  for insert to authenticated
  with check (
    coach_id = (select auth.uid())
    and (select public.is_my_student(student_id))
  );

drop policy if exists coach_notes_update on public.coach_notes;
create policy coach_notes_update on public.coach_notes
  for update to authenticated
  using (coach_id = (select auth.uid()))
  with check (
    coach_id = (select auth.uid())
    and (select public.is_my_student(student_id))
  );

drop policy if exists coach_notes_delete on public.coach_notes;
create policy coach_notes_delete on public.coach_notes
  for delete to authenticated
  using (coach_id = (select auth.uid()));
