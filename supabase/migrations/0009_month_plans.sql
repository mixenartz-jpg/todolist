-- ═══════════════════════════════════════════════════════════════════
-- 0009 — Ayın GENEL PLANI (not kartları)
-- ═══════════════════════════════════════════════════════════════════
--
-- Uygulamada üç serbest metin yüzeyi vardı ve üçü de yanlış ölçekte:
--
--   day_notes.plan : tek GÜN, ileriye dönük ("bugün şunları yapacağım")
--   day_notes.note : tek GÜN, geriye dönük ("nasıl geçti")
--   journal        : tarihe bağlı serbest defter
--
-- Eksik olan AY ölçeği: "bu ay neye odaklanıyorum, hangi riskler var,
-- neyi denemek istiyorum".
--
-- ── Neden tek büyük metin DEĞİL de kartlar? ──
-- Önce ay başına tek `body` sütunu tasarlanmıştı. Kullanılınca ortaya
-- çıktı ki tek dev textarea bir düşünceyi ötekinden ayırmıyor: not
-- büyüdükçe içinde arama yapılamıyor, bir maddeyi silmek metnin
-- ortasından cümle kesmek oluyordu. Kart başına satır, `plan_goals`'un
-- zaten kanıtlanmış etkileşimini (tıkla-düzenle, sil, renkle ayır)
-- buraya taşıyor.
--
-- ── O hâlde neden plan_goals'un kendisi değil? ──
-- Hedef ÖLÇÜLEN bir şeydir: `target_count`, `done_count`, ilerleme
-- çubuğu ve görev bağlama onun etrafında kurulu. Genel planlama notu
-- ölçülmez — "bu ay sınav haftası var, ona göre plan yap" bir hedef
-- değil bir bağlamdır. Aynı tabloya koymak, her not satırında anlamsız
-- duran ve arayüzde gizlenmesi gereken dört sütun demekti.
--
-- ── Neden journal'a değil? ──
-- journal tarihe bağlıdır. Ay ölçeğinde bir kayıt oraya girseydi
-- "1 Eylül tarihli not" gibi görünür ve Defter ekranının tarih
-- gruplamasında yanlış yere düşerdi.
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

  -- plan_goals.title ile aynı sınır (120): ikisi de tek satırlık bir
  -- başlıktır ve aynı formda, aynı genişlikte yazılır. Farklı sınır
  -- koymak, kullanıcının iki ekranda iki farklı kesilme noktasıyla
  -- karşılaşması olurdu.
  title   text not null check (length(trim(title)) between 1 and 120),

  -- Ayrıntı İSTEĞE BAĞLI — plan_goals.note ile aynı gerekçe: bazı
  -- notların başlığı zaten tam cümledir ("Sınav haftası 12-16'sı") ve
  -- açıklama istemek boşuna yazma sürtünmesidir.
  --
  -- 2000 karakter: plan_goals.note ile aynı ölçek. Kart başına düşen
  -- metin, tek dev nota göre çok daha kısa olur; 10000'e gerek yok.
  body    text check (body is null or length(body) <= 2000),

  -- Kimlik rengi: plan_goals ve categories ile AYNI palet. Notlar ve
  -- hedefler aynı sekmeler arasında yan yana okunuyor; ikinci bir renk
  -- dili, aynı ekranda iki ayrı anlam sistemi demek olurdu.
  color_slot smallint not null default 0 check (color_slot between 0 and 7),

  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.month_plans is
  'Ayın genel planlama notları — kart başına bir satır. plan_goals''un (ölçülen hedefler) tamamlayıcısıdır.';
comment on column public.month_plans.month is
  'Notun ayı, ayın 1''ine sabitlenmiş. plan_goals.month ile aynı temsil.';
comment on column public.month_plans.body is
  'İsteğe bağlı ayrıntı. null → başlık tek başına yeterli.';

-- Ekranın tek sorgu şekli: "bu kullanıcının şu aydaki notları, kendi
-- sırasıyla". `month desc` çünkü kullanıcı en çok güncel aya bakar —
-- plan_goals_user_month_idx ile birebir aynı gerekçe.
create index month_plans_user_month_idx
  on public.month_plans (user_id, month desc, sort_order);

-- `unique` kısıtı YOK — plan_goals ile aynı gerekçe: aynı ay için
-- birden çok not normal durumdur, zaten tasarımın amacı bu. Aynı
-- başlıkta iki not yazmak kullanıcı hatasıdır ama şema hatası değildir.


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
