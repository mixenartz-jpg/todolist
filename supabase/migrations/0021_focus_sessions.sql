-- ═══════════════════════════════════════════════════════════════════
-- 0021 — Odak oturumları
--
-- Zen ekranı bugüne kadar hiçbir şey kaydetmiyordu ve bu BİLEREK
-- böyleydi: sayaç "Zen'in açık olduğu süreyi" ölçüyor, "çalışılan
-- süreyi" değil. Kullanıcı ekranı açık bırakıp kahve içmiş olabilir
-- ve ölçmediğimiz bir şeyi kaydetmek veriyi yalancı yapar.
--
-- O gerekçe DURAKLATMA YOKLUĞUNDAN doğuyordu. Artık duraklatma var ve
-- sekme 60 saniyeden uzun arka planda kalırsa sayaç kendiliğinden
-- duruyor. Ölçülen şey gerçekten çalışılan süreye yaklaştı; tablo bu
-- yüzden açılabiliyor.
--
-- `if exists` / `if not exists` her yerde: migration'lar append-only
-- ve bu dosya bir kereden fazla çalıştırılabilmeli.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- ── Neden `on delete set null` + başlık KOPYASI? ──
  -- Görev silinince odak geçmişi silinmemeli: "bu hafta 12 saat
  -- odaklandım" bilgisi, görevin hâlâ var olmasına bağlı olamaz.
  --
  -- Başlık satıra kopyalanıyor ki silinmiş görevin kaydı "(bilinmeyen
  -- iş)" diye okunmasın. `completed_at`in `done`dan ayrı tutulması
  -- (0017) ile aynı ruh: DURUM ve TARİH ayrı yaşar.
  --
  -- Görev sonradan yeniden adlandırılırsa eski kayıtta ESKİ ad kalır
  -- ve bu KASITLI: oturum, o an neye odaklanıldığının kaydı. Geçmiş
  -- kayıtları güncellemek, geçmişi yeniden yazmak olurdu.
  task_id uuid references public.tasks(id) on delete set null,
  task_title text not null,

  -- 'break' değeri YOK: tablo yalnızca odak turlarını tutuyor, böylece
  -- "bugün ne kadar çalıştım" sorusu burada TEK anlamlı kalıyor. Mola
  -- kaydı istenirse kısıt genişletilir.
  mode text not null check (mode in ('free', 'pomodoro')),

  started_at timestamptz not null,
  ended_at timestamptz not null,

  -- ── Neden TÜRETİLMİYOR? ──
  -- `ended_at - started_at` duraklamaları İÇERİR ve tam da
  -- kaçındığımız yalanı üretir. Net süre istemcide, duraklamalar
  -- düşülerek hesaplanıp yazılıyor.
  net_seconds integer not null check (net_seconds >= 0),

  created_at timestamptz not null default now()
);

comment on table public.focus_sessions is
  'Odak (Zen) oturumlari. Her odak TURU bir satir; mola satiri yoktur.';
comment on column public.focus_sessions.task_title is
  'Gorev basliginin o anki kopyasi. Gorev silinse de gecmis okunabilir kalsin diye.';
comment on column public.focus_sessions.net_seconds is
  'Duraklamalar dusulmus net sure. ended_at - started_at ile AYNI DEGILDIR.';

-- Ekranın tek sorgu şekli: "bu kullanıcının oturumları, en yeniden
-- eskiye". `tasks_user_completed_idx` (0017) ile aynı şekil.
create index if not exists focus_sessions_user_started_idx
  on public.focus_sessions (user_id, started_at desc);


-- ═══════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════
-- 0002'nin üç kuralı: `(select auth.uid())` alt sorgu formu,
-- `to authenticated` kapsamı, INSERT'te `with check`.

alter table public.focus_sessions enable row level security;

drop policy if exists focus_sessions_select on public.focus_sessions;
create policy focus_sessions_select on public.focus_sessions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists focus_sessions_insert on public.focus_sessions;
create policy focus_sessions_insert on public.focus_sessions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- ── UPDATE politikası YOK ──
-- Bir odak oturumu BİTMİŞ bir olaydır; düzeltilecek bir şey yok.
-- Politikayı yazmamak, yanlışlıkla geçmişi değiştiren bir kod yolunu
-- yapısal olarak imkânsız kılıyor.

drop policy if exists focus_sessions_delete on public.focus_sessions;
create policy focus_sessions_delete on public.focus_sessions
  for delete to authenticated
  using ((select auth.uid()) = user_id);


-- ═══════════════════════════════════════════════════════════════════
-- Trigger
-- ═══════════════════════════════════════════════════════════════════
-- İstemci `user_id` GÖNDERMEZ; değer sunucuda oturumdan damgalanır
-- (0003). `updated_at` trigger'ı YOK — satır güncellenmiyor.

drop trigger if exists focus_sessions_stamp_user_id on public.focus_sessions;
create trigger focus_sessions_stamp_user_id
  before insert on public.focus_sessions
  for each row execute function public.stamp_user_id();
