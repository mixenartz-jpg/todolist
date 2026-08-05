-- ═══════════════════════════════════════════════════════════════════
-- 0001 — Şema
--
-- İki tasarım kararı burada kodlanmıştır:
--
-- 1. `entries` tablosunda `done` sütunu YOKTUR. Tamamlanma
--    `value >= routines.target` ifadesinden türetilir. İki ayrı
--    doğruluk kaynağı tutmak, matrisin bir şey gösterip istatistiğin
--    başka bir şey hesaplamasına yol açar.
--
-- 2. Program (`schedule`) `routines` üzerinde DEĞİL, zamana bağlı
--    `routine_schedules` tablosundadır. Kullanıcı bir rutini "her
--    gün"den "Pzt/Çrş/Cum"a çevirdiğinde, program yerinde
--    güncellenirse geçmişteki tüm Salılar geriye dönük "zorunlu
--    değildi" olur — yüzdeler zıplar, kırılmış seriler kendiliğinden
--    iyileşir. Append-only zaman çizelgesi geçmişi dokunulmaz kılar.
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────── routines ─────────────────────────────
create table public.routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 80),
  icon        text check (icon is null or length(icon) <= 8),

  -- Kimlik rengi: 8 doğrulanmış slottan biri. Sıra renk körlüğü
  -- güvenliğinin mekanizmasıdır, kozmetik değildir.
  color_slot  smallint not null default 0 check (color_slot between 0 and 7),

  -- Sayısal hedef. Boolean rutin = target 1 olan rutin; ayrı kod yolu yok.
  target      numeric not null default 1 check (target > 0),
  unit        text check (unit is null or length(unit) <= 16),

  -- Rutinin izlenmeye başladığı gün. Bugün oluşturulan bir rutin
  -- Ocak ayı için "200 gün kaçırıldı" raporlamamalıdır.
  start_date  date not null default ((now() at time zone 'Europe/Istanbul')::date),

  sort_order  integer not null default 0,
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);

comment on column public.routines.target is
  'Tamamlanma eşiği. entries.value >= target ise o gün tamamlanmıştır.';
comment on column public.routines.start_date is
  'Bu tarihten önce rutin zorunlu değildir (istatistikleri bozmaz).';

create index routines_user_sort_idx
  on public.routines (user_id, archived_at nulls first, sort_order);

-- ───────────────────────── routine_schedules ────────────────────────
-- Programın zaman çizelgesi. D tarihindeki geçerli program =
-- effective_from <= D olan en büyük satır.
create table public.routine_schedules (
  routine_id     uuid not null references public.routines (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  effective_from date not null,
  schedule       jsonb not null,
  created_at     timestamptz not null default now(),

  primary key (routine_id, effective_from),

  -- Bozuk şeklin veritabanına girmesini engeller. jsonb esnekliği
  -- doğrulamasızlık anlamına gelmemeli.
  constraint schedule_shape_valid check (
    (schedule ->> 'kind') = 'daily'
    or (
      (schedule ->> 'kind') = 'weekdays'
      and jsonb_typeof(schedule -> 'days') = 'array'
      and jsonb_array_length(schedule -> 'days') between 1 and 7
    )
    or (
      (schedule ->> 'kind') = 'flexible'
      and (schedule ->> 'per') in ('week', 'month')
      and (schedule ->> 'count')::int between 1 and 31
    )
  )
);

comment on table public.routine_schedules is
  'Append-only program geçmişi. Program değişikliği yeni satır yazar, '
  'eskisini güncellemez — geçmiş istatistikler bozulmasın diye.';
comment on column public.routine_schedules.schedule is
  '{"kind":"daily"} | {"kind":"weekdays","days":[1,3,5]} | '
  '{"kind":"flexible","count":3,"per":"week"}. Gün numaraları ISO-8601: Pzt=1…Paz=7.';

create index routine_schedules_lookup_idx
  on public.routine_schedules (routine_id, effective_from desc);

-- ────────────────────────────── entries ─────────────────────────────
-- value = 0 satırı ASLA yazılmaz; işaret kaldırılınca satır silinir.
-- Yokluk = 0 demektir. Bu sayede optimistic güncellemenin ürettiği
-- şekil ile sunucudan gelen şekil yapısal olarak aynıdır.
create table public.entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  routine_id uuid not null references public.routines (id) on delete cascade,
  date       date not null,
  value      numeric not null check (value > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (routine_id, date)
);

-- Matrisin ve istatistiğin tek sorgu şekli: (user_id, tarih aralığı).
-- INCLUDE ile index-only scan mümkün olur.
create index entries_user_date_idx
  on public.entries (user_id, date desc) include (routine_id, value);

-- ─────────────────────────────── tasks ──────────────────────────────
-- Tek seferlik görevler. Rutinlerden ayrıdır ve rutin istatistiklerine
-- karışmaz.
create table public.tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null check (length(trim(title)) between 1 and 200),
  due_date   date,
  done       boolean not null default false,
  note       text check (note is null or length(note) <= 2000),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index tasks_user_due_idx on public.tasks (user_id, due_date, done);

-- ───────────────────────────── day_notes ────────────────────────────
create table public.day_notes (
  user_id    uuid not null references auth.users (id) on delete cascade,
  date       date not null,
  note       text check (note is null or length(note) <= 2000),
  mood       smallint check (mood between 1 and 5),
  updated_at timestamptz not null default now(),

  primary key (user_id, date)
);
