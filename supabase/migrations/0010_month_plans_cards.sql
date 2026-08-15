-- ═══════════════════════════════════════════════════════════════════
-- 0010 — month_plans: tek metinden NOT KARTLARINA
-- ═══════════════════════════════════════════════════════════════════
--
-- 0009 ay başına TEK satır tutuyordu: yalnızca `body`, ay başına bir
-- serbest metin. Kullanılınca ortaya çıktı ki tek dev textarea bir
-- düşünceyi ötekinden ayırmıyor — not büyüdükçe içinde arama
-- yapılamıyor, bir maddeyi silmek metnin ortasından cümle kesmek
-- oluyordu. Ekran artık kart başına bir satır gösteriyor
-- (plan_goals'un kanıtlanmış etkileşimi: tıkla-düzenle, sil, renkle
-- ayır).
--
-- ── Neden 0009'u düzenlemek yerine yeni migration? ──
-- 0009 ÇALIŞTIRILMIŞ bir migration'dır. Uygulanmış bir dosyayı yerinde
-- değiştirmek, veritabanı ile depo arasında sessiz bir ayrışma yaratır:
-- tabloda `title` yoktur ama kod onu gönderir ve her insert reddedilir.
-- Migration'lar ekle-only bir günlüktür; geçmişi düzenlemek değil,
-- üstüne yazmak gerekir.
--
-- ── Neden `if exists` / `if not exists` bezemesi? ──
-- Bu dosya İKİ farklı durumu da karşılamak zorunda:
--   1. 0009'un ESKİ hâli çalıştırılmış (tablo var, sütunlar eksik)
--   2. Hiç çalıştırılmamış, depo 0009'un yeni hâliyle kurulmuş
--      (tablo zaten doğru biçimde var)
-- Koşulsuz `alter` ikinci durumda patlardı ve yeni bir ortam kurmak
-- imkânsız hâle gelirdi.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Ay başına tek satır kısıtını KALDIR ────────────────────────
--
-- Tasarımın amacı zaten ayda birden çok not; unique index ikinci notu
-- engelliyordu. plan_goals'da da unique yoktur, aynı gerekçeyle.
drop index if exists public.month_plans_user_month_idx;

-- ── 2. Kart alanlarını ekle ───────────────────────────────────────

-- Başlık. `plan_goals.title` ile aynı sınır (120): ikisi de tek
-- satırlık bir başlıktır, aynı formda aynı genişlikte yazılır.
--
-- Sütun NULLABLE eklenir, dolduruluru, sonra NOT NULL'a çekilir:
-- var olan satırlar için doğrudan `not null` eklemek, değeri olmayan
-- satırlar yüzünden reddedilirdi.
alter table public.month_plans
  add column if not exists title text,
  add column if not exists color_slot smallint not null default 0,
  add column if not exists sort_order integer not null default 0;

-- ── 3. Var olan satırları taşı ────────────────────────────────────
--
-- 0009 döneminde yazılmış notlar yalnızca `body` taşıyor ve başlıksız
-- kalamazlar. Metnin İLK SATIRI başlığa alınır (kullanıcı zaten
-- genelde ilk satıra konuyu yazar), 120'yi aşarsa kırpılır. Boş ya da
-- yalnızca boşluktan oluşan gövde için bir yer tutucu konur —
-- veri KAYBETMEMEK, güzel görünmekten önce gelir.
update public.month_plans
set title = coalesce(
  nullif(left(trim(split_part(body, E'\n', 1)), 120), ''),
  'Genel plan'
)
where title is null;

alter table public.month_plans
  alter column title set not null;

-- ── 4. Kısıtları yeni sözleşmeye göre yaz ─────────────────────────

-- Başlık: 1..120, boşluk-only kabul edilmez (plan_goals ile aynı).
alter table public.month_plans
  drop constraint if exists month_plans_title_check;
alter table public.month_plans
  add constraint month_plans_title_check
  check (length(trim(title)) between 1 and 120);

-- Gövde artık İSTEĞE BAĞLI: başlığı tam cümle olan notlar
-- ("Sınav haftası 12-16'sı") ayrıca açıklama istemez.
--
-- Eski `not null` ve 10000'lik sınır kaldırılır; yeni sınır 2000
-- (plan_goals.note ile aynı ölçek — kart başına düşen metin, tek dev
-- nota göre çok daha kısadır).
alter table public.month_plans
  alter column body drop not null;

alter table public.month_plans
  drop constraint if exists month_plans_body_check;

-- Kırpma ÖNCE: eski sınır 10000'di ve 2000'i aşan bir satır varsa yeni
-- kısıt eklenemezdi. Kırpmak veri kaybıdır ama kısıtsız bırakmak
-- şemayı kodla ayrıştırırdı; pratikte 2000 karakteri aşan bir not
-- yazılmış olması çok düşük ihtimal.
update public.month_plans
set body = left(body, 2000)
where body is not null and length(body) > 2000;

alter table public.month_plans
  add constraint month_plans_body_check
  check (body is null or length(body) <= 2000);

-- Renk paleti: categories / plan_goals ile AYNI sekiz slot.
alter table public.month_plans
  drop constraint if exists month_plans_color_slot_check;
alter table public.month_plans
  add constraint month_plans_color_slot_check
  check (color_slot between 0 and 7);

-- ── 5. Okuma index'i ──────────────────────────────────────────────
--
-- Ekranın tek sorgu şekli: "bu kullanıcının şu aydaki notları, kendi
-- sırasıyla". `month desc` çünkü kullanıcı en çok güncel aya bakar —
-- plan_goals_user_month_idx ile birebir aynı gerekçe.
create index if not exists month_plans_user_month_idx
  on public.month_plans (user_id, month desc, sort_order);

comment on table public.month_plans is
  'Ayın genel planlama notları — kart başına bir satır. plan_goals''un (ölçülen hedefler) tamamlayıcısıdır.';
comment on column public.month_plans.body is
  'İsteğe bağlı ayrıntı. null → başlık tek başına yeterli.';
