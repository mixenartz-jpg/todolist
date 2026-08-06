-- ═══════════════════════════════════════════════════════════════════
-- 0004 — Notlar
--
-- `day_notes` ile KARIŞTIRILMAMALIDIR. İkisi farklı şeylerdir:
--
--   day_notes : gün başına BİR kayıt (primary key user_id + date).
--               "Bugün nasıl geçti" değerlendirmesi ve ruh hali.
--               Bugün ekranının parçası, günlük akışa bağlı.
--
--   notes     : serbest defter. Aynı güne istediğin kadar not
--               yazabilirsin, her notun kendi başlığı ve tarihi var.
--               Günlük akıştan bağımsız, geriye dönük aranabilir.
--
-- Ayrı tablo olmasının sebebi budur: `day_notes`'un birincil anahtarı
-- günde tek kayda izin verir ve bu kısıt oranın DOĞRU davranışıdır
-- (iki "bugün nasıl geçti" değerlendirmesi anlamsız olurdu). Onu
-- gevşetmek mevcut özelliği bozardı.
-- ═══════════════════════════════════════════════════════════════════

create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,

  -- Başlık zorunlu değildir: bazı notların doğal bir başlığı yoktur ve
  -- kullanıcıyı uydurmaya zorlamak yazma sürtünmesi yaratır. Liste
  -- ekranı başlık yoksa gövdenin ilk satırını gösterir.
  title      text check (title is null or length(trim(title)) <= 120),

  -- Gövde zorunludur: içeriksiz not kayıt değil, gürültüdür.
  body       text not null check (length(trim(body)) between 1 and 10000),

  -- Notun ait olduğu gün. `created_at` DEĞİL: kullanıcı dün olan bir
  -- şeyi bugün yazabilir ve not dünle ilişkilendirilmelidir.
  date       date not null default ((now() at time zone 'Europe/Istanbul')::date),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notes is
  'Serbest defter. Gün başına birden çok not olabilir — günde tek '
  'kayıt tutan day_notes''tan ayrıdır.';
comment on column public.notes.date is
  'Notun ilişkili olduğu gün; yazıldığı an değil.';

-- Ekranın tek sorgu şekli: kullanıcının notları, tarihe göre yeniden
-- eskiye. İkincil olarak created_at — aynı güne yazılmış notlar
-- kararlı ve öngörülebilir sırada kalsın.
create index notes_user_date_idx
  on public.notes (user_id, date desc, created_at desc);

-- ─────────────────────────────── RLS ────────────────────────────────
alter table public.notes enable row level security;

create policy notes_select on public.notes
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy notes_insert on public.notes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy notes_update on public.notes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy notes_delete on public.notes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ───────────────────────────── Trigger'lar ──────────────────────────
-- İstemci `user_id` göndermez; değer sunucuda oturumdan damgalanır.
create trigger notes_stamp_user_id
  before insert on public.notes
  for each row execute function public.stamp_user_id();

create trigger notes_touch_updated_at
  before update on public.notes
  for each row execute function public.touch_updated_at();
