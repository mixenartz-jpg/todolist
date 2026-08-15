-- ═══════════════════════════════════════════════════════════════════
-- 0009 — Ayın GENEL PLANI
-- ═══════════════════════════════════════════════════════════════════
--
-- Uygulamada üç serbest metin yüzeyi vardı ve üçü de yanlış ölçekte:
--
--   day_notes.plan : tek GÜN, ileriye dönük ("bugün şunları yapacağım")
--   day_notes.note : tek GÜN, geriye dönük ("nasıl geçti")
--   journal        : tarihe bağlı serbest defter
--
-- Eksik olan AY ölçeği: "bu ay neye odaklanıyorum, hangi riskler var,
-- neyi denemek istiyorum". plan_goals bu boşluğu doldurmaz çünkü o
-- YAPILANDIRILMIŞ bir listedir (başlık + sayaç + renk); genel planlama
-- yapılandırılmamış düşünme alanıdır ve ikisi farklı işlerdir.
--
-- ── Neden plan_goals'a bir SÜTUN değil? ──
-- Hedefler ay başına ÇOK satırdır, genel not ay başına TEK satır. Aynı
-- tabloya koymak, her hedef satırında tekrarlanan ve birbiriyle
-- çelişebilen bir metin sütunu demekti: kullanıcı ikinci hedefi
-- eklediğinde metin hangi satırdan okunacaktı?
--
-- ── Neden journal'a değil? ──
-- journal tarihe bağlıdır. Ay ölçeğinde bir kayıt oraya girseydi
-- "1 Eylül tarihli not" gibi görünür ve Defter ekranının tarih
-- gruplamasında yanlış yere düşerdi — ay boyunca güncellenen bir metin,
-- ayın ilk gününe ait bir günlük kaydı gibi okunurdu.
-- ═══════════════════════════════════════════════════════════════════

create table public.month_plans (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- plan_goals.month ile AYNI kanonik temsil; "neden date, neden ayın
  -- 1'i" gerekçesi 0008'de uzun uzun yazılı. İki tablo aynı `?ay=`
  -- çapasıyla sorgulanacağı için biçimlerinin de aynı olması ZORUNLU:
  -- Hedefler'de '2026-09-01' arayıp burada başka bir temsil kullanmak,
  -- aynı ayın iki farklı anahtarı demek olurdu.
  month   date not null check (extract(day from month) = 1),

  -- Serbest metin. `not null`: satırın var olması metnin var olması
  -- demektir; boşaltıldığında uygulama satırı SİLER (day_notes ile aynı
  -- mantık — boş metin bir kayıt değildir, saklamak çöp biriktirmektir).
  --
  -- 10000 karakter, day_notes.plan'ın (4000) ÜSTÜNDE: burası bir günün
  -- değil bir AYIN düşüncesidir ve pratikte birkaç paragraf tutar.
  -- journal.body ile (0004) aynı ölçek — ikisi de "uzunca yazılan
  -- serbest metin" sınıfında.
  body    text not null check (length(body) <= 10000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.month_plans is
  'Ayın genel planı — serbest metin. plan_goals''un (yapılandırılmış hedef listesi) tamamlayıcısıdır.';
comment on column public.month_plans.month is
  'Planın ayı, ayın 1''ine sabitlenmiş. plan_goals.month ile aynı temsil.';
comment on column public.month_plans.body is
  'Serbest metin. Boşaltıldığında uygulama satırı siler; bu yüzden not null.';

-- Ay başına TEK satır.
--
-- Uygulama upsert ediyor ve `onConflict: "user_id,month"` tam olarak bu
-- index'i hedef alıyor — kısıt olmasa upsert'ün çakışacak bir hedefi
-- olmaz ve her yazma yeni satır eklerdi. Ekran o zaman hangisini
-- göstereceğini bilemez, `maybeSingle()` de hata dönerdi.
--
-- Ayrıca ekranın TEK sorgu şekli budur ("bu kullanıcının şu ayki
-- planı"), yani ayrı bir okuma index'ine gerek yok: unique index
-- aramayı da karşılıyor.
create unique index month_plans_user_month_idx
  on public.month_plans (user_id, month);


-- ═══════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════

alter table public.month_plans enable row level security;

create policy month_plans_select on public.month_plans
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy month_plans_insert on public.month_plans
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy month_plans_update on public.month_plans
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy month_plans_delete on public.month_plans
  for delete to authenticated
  using ((select auth.uid()) = user_id);


-- ═══════════════════════════════════════════════════════════════════
-- Trigger'lar
-- ═══════════════════════════════════════════════════════════════════
-- İstemci `user_id` göndermez; değer sunucuda oturumdan damgalanır
-- (0003). `updated_at` de aynı yerden bakılır.

create trigger month_plans_stamp_user_id
  before insert on public.month_plans
  for each row execute function public.stamp_user_id();

create trigger month_plans_touch_updated_at
  before update on public.month_plans
  for each row execute function public.touch_updated_at();
