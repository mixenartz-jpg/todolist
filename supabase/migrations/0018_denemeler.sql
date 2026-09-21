-- ═══════════════════════════════════════════════════════════════════
-- 0018 — Denemeler (deneme sınavı + ders bazlı sonuç)
--
-- Uygulamanın YKS alanına açıldığı ilk migration. Bir deneme oturumu
-- ve onun ders kırılımı iki tabloda tutulur; net İKİSİNDE DE
-- saklanmaz, türetilir (gerekçe aşağıda).
--
-- ── Neden iki tablo, tek tablo + jsonb DEĞİL? ──
-- Ders sonuçlarını `jsonb` olarak tek satırda tutmak cazip: okuma tek
-- satır, yazma tek update. Ama üç şeyi kaybederdik:
--   · Kısıtlar. `dogru + yanlis + bos = soru_sayisi` değişmezi jsonb
--     içinde ZORLANAMAZ; veri giriş hatalarının çoğunu bedavaya
--     yakalayan şey tam olarak o kısıt.
--   · "Son 10 denemede matematik netim" sorgusu jsonb açmadan
--     yazılamaz ve index'lenemez.
--   · Ders bazlı hedef net satır başına bir değer; jsonb'de her
--     okuma bir ayrıştırma turu olurdu.
--
-- ── Neden `net` SÜTUNU YOK? ──
-- Net tamamen türetilmiş bir değerdir: `dogru - yanlis / 4.0`.
-- Saklamak, `dogru` güncellenip `net` güncellenmediğinde YALAN
-- SÖYLEYEBİLEN ikinci bir gerçek kaynağı yaratır. Hesap TypeScript'te
-- saf bir fonksiyondur (src/features/deneme/net.ts) ve test edilen
-- yer orasıdır. `tasks.done` / `completed_at` ayrımıyla aynı disiplin:
-- türetilebilen şey türetilir.
--
-- Maliyet önemsiz: bir deneme en fazla ~14 ders satırı taşır.
-- ═══════════════════════════════════════════════════════════════════

create table public.denemeler (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Kullanıcının denemeyi andığı ad: "3D Yayınları TYT-7".
  --
  -- Zorunlu ve SERBEST METİN. Ayrı bir `yayinevi` sütunu DEĞİL:
  -- kullanıcı denemeyi tek parça olarak anıyor ve yayınevini ayrı
  -- alana yazdırmak her kayıtta fazladan bir adım olurdu. Ayrıca
  -- yayınevi olmayan denemeler var (okul denemesi, kendi derlediği
  -- set) ve onlarda o alan boş kalırdı.
  ad      text not null check (length(trim(ad)) between 1 and 120),

  -- Deneme türü. Ekranın en önemli ayrımı BURADA:
  --   tyt / ayt → genel deneme, net trendine girer
  --   brans     → tek dersin denemesi, trendde AYRI çizilir
  --   ydt       → yabancı dil
  --
  -- ── Neden `brans` ayrı bir tür? ──
  -- Branş denemesi tek ders olduğu için toplam neti genel denemeyle
  -- kıyaslanamaz (40 soruluk matematik denemesinden 35 net ile 120
  -- soruluk TYT'den 85 net aynı eksende çizilemez). İkisini aynı
  -- trend çizgisinde ortalamak, alan araştırmasında tekrar tekrar
  -- rastlanan gerçek bir doğruluk hatası. Tür şemada ZORUNLU ki
  -- ayrım istemcinin insafına kalmasın.
  tur     text not null check (tur in ('tyt', 'ayt', 'brans', 'ydt')),

  -- Alan — yalnızca AYT için anlamlı. AYT'de aday 160 sorunun
  -- 80'ini cevaplar ve hangi 80 olduğunu alan belirler.
  --
  -- Kısıt iki yönlü: AYT alan taşımak ZORUNDA, diğerleri taşıyamaz.
  -- Tek yönlü olsaydı "branş denemesi + alan=say" gibi anlamsız
  -- satırlar doğar ve trend hesabı onları nereye koyacağını bilemezdi.
  alan    text check (alan in ('say', 'ea', 'soz', 'dil')),
  constraint deneme_alan_tutarli check (
    (tur = 'ayt' and alan is not null) or (tur <> 'ayt' and alan is null)
  ),

  -- Denemenin ÇÖZÜLDÜĞÜ gün; kaydedildiği an değil.
  -- Dün çözülen bir deneme bugün girilebilir ve düne ait olmalıdır
  -- (0004 `notes.date` ve 0005 `mistakes.date` ile aynı gerekçe).
  tarih   date not null default ((now() at time zone 'Europe/Istanbul')::date),

  -- Kullanılan süre, dakika. İsteğe bağlı: her deneme süre tutularak
  -- çözülmüyor ve zorunlu kılmak yalan veri üretirdi.
  -- Üst sınır 400: TYT 165, AYT 180 dakika; 400 rahat bir tavan.
  sure_dk smallint check (sure_dk is null or sure_dk between 1 and 400),

  note    text check (note is null or length(note) <= 2000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.denemeler is
  'Deneme sınavı oturumu. Net SAKLANMAZ, ders satırlarından türetilir.';
comment on column public.denemeler.tarih is
  'Denemenin çözüldüğü gün; kaydedildiği an değil.';
comment on column public.denemeler.tur is
  'tyt/ayt genel denemedir; brans tek derstir ve trendde ayrı çizilir.';

-- Ekranın tek sorgu şekli: kullanıcının denemeleri, yeniden eskiye.
create index denemeler_user_tarih_idx
  on public.denemeler (user_id, tarih desc, created_at desc);

-- ─────────────────────── Ders bazlı sonuç ───────────────────────────

create table public.deneme_dersleri (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users (id) on delete cascade,

  -- `on delete cascade`: ders sonucu denemesiz anlamsızdır. Deneme
  -- silinince satırları da gider; yetim satır bırakmak çeteleyi
  -- sessizce şişirirdi.
  deneme_id uuid not null references public.denemeler (id) on delete cascade,

  -- Ders adı SERBEST METİN, ayrı bir `dersler` tablosu yok.
  --
  -- 0005'in gerekçesi aynen geçerli: ayrı tablo, kullanılmayan bir
  -- yönetim yüzeyi ve her kayıtta "önce dersi tanımla" adımı
  -- doğururdu. Varsayılan ders listesi `tur`'dan TÜRETİLİR
  -- (src/features/deneme/sinav.ts) ve yazım tutarsızlığı istemcide
  -- normalleştirilir (src/lib/text/normalize.ts).
  ders      text not null check (length(trim(ders)) between 1 and 60),

  dogru     smallint not null default 0 check (dogru >= 0),
  yanlis    smallint not null default 0 check (yanlis >= 0),
  bos       smallint not null default 0 check (bos >= 0),

  -- Toplam soru sayısı — İSTEMCİDEN gelir, sabit tablodan değil.
  --
  -- ── Neden veritabanında sabit bir ders→soru tablosu yok? ──
  -- ÖSYM soru dağılımını değiştirebilir ve yayınevi denemeleri resmî
  -- dağılımı birebir izlemez (38 soruluk "TYT matematik" denemesi
  -- olağandır). Sabit tablo, o denemeyi kaydetmeyi İMKÂNSIZ kılardı.
  -- Uygulama varsayılanı önerir, kullanıcı gerekirse düzeltir.
  soru_sayisi smallint not null check (soru_sayisi between 1 and 200),

  -- Değişmez: üç kova toplamı soru sayısını vermeli.
  --
  -- Veri giriş hatalarının ÇOĞUNU bedavaya yakalar ve istemcide
  -- üçüncü alanı otomatik doldurmanın da dayanağıdır. Son savunma
  -- hattı: uygulama zaten tutarlı üçlü gönderir.
  constraint deneme_ders_toplam check (dogru + yanlis + bos = soru_sayisi),

  -- Bu dersten hedeflenen net. İsteğe bağlı.
  --
  -- `numeric(5,2)`: net 0.25'in katıdır ve kesirlidir; smallint
  -- taşıyamaz. 0001'in "numeric supabase-js'e STRING gelir" tuzağı
  -- burada KABUL EDİLİR çünkü değer kesirli olmak ZORUNDA — istemci
  -- sınırda `Number()` ile açar (bkz. toDenemeDers).
  hedef_net numeric(5,2),

  -- Ders sırası: TYT'de Türkçe önce gelir, Fen sonra. Ekran bu
  -- sırayı korur; alfabetik sıralama sınav düzenini bozardı.
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Aynı denemede aynı ders iki kez olamaz. Olsaydı toplam net
  -- sessizce iki katına çıkardı.
  constraint deneme_ders_benzersiz unique (deneme_id, ders)
);

comment on table public.deneme_dersleri is
  'Denemenin ders kırılımı. Net türetilir: dogru - yanlis / 4.';
comment on column public.deneme_dersleri.soru_sayisi is
  'İstemciden gelir: yayınevi denemeleri resmî dağılımı izlemeyebilir.';

-- Bir denemenin ders satırlarını sırasıyla getirir. `deneme_id`
-- üzerindeki FK'nin index'i de budur (indekssiz FK, ebeveyn silme
-- işlemini tam taramaya çevirir).
create index deneme_dersleri_deneme_idx
  on public.deneme_dersleri (deneme_id, sort_order);

-- "Son N denemede bu dersten netim" sorgusu için. `user_id` önce:
-- eşitlik sütunu range sütunundan önce gelir.
create index deneme_dersleri_user_ders_idx
  on public.deneme_dersleri (user_id, ders);

-- ─────────────────────────────── RLS ────────────────────────────────

alter table public.denemeler enable row level security;

create policy denemeler_select on public.denemeler
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy denemeler_insert on public.denemeler
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy denemeler_update on public.denemeler
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy denemeler_delete on public.denemeler
  for delete to authenticated
  using ((select auth.uid()) = user_id);

alter table public.deneme_dersleri enable row level security;

create policy deneme_dersleri_select on public.deneme_dersleri
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy deneme_dersleri_insert on public.deneme_dersleri
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy deneme_dersleri_update on public.deneme_dersleri
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy deneme_dersleri_delete on public.deneme_dersleri
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ───────────────────────────── Trigger'lar ──────────────────────────

-- İstemci `user_id` göndermez; değer sunucuda oturumdan damgalanır.
create trigger denemeler_stamp_user_id
  before insert on public.denemeler
  for each row execute function public.stamp_user_id();

create trigger denemeler_touch_updated_at
  before update on public.denemeler
  for each row execute function public.touch_updated_at();

/**
 * Denemeye bağlı bir satırın sahibini DENEMEDEN devralır.
 *
 * Oturumdan damgalamak (`stamp_user_id`) yeterli olurdu, ama
 * denemeden okumak tutarsızlığı YAPISAL olarak imkânsız kılar:
 * bir denemenin çocuğu başka bir kullanıcıya ait olamaz.
 * `stamp_schedule_owner` (0003) ile birebir aynı desen ve gerekçe.
 *
 * Adı `..._ders_owner` DEĞİL `..._child_owner`: 0019'daki yanlışlar
 * tablosu da aynı sözleşmeyi paylaşıyor ve ders adını taşıyan bir
 * fonksiyonu oraya bağlamak, okuyana yanlış şey söylerdi. Tek koşul
 * `new.deneme_id` alanının var olması.
 */
create or replace function public.stamp_deneme_child_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
begin
  select d.user_id into new.user_id
  from public.denemeler d
  where d.id = new.deneme_id;

  if new.user_id is null then
    raise exception 'Deneme bulunamadı: %', new.deneme_id;
  end if;

  return new;
end;
$fn$;

create trigger deneme_dersleri_stamp_owner
  before insert on public.deneme_dersleri
  for each row execute function public.stamp_deneme_child_owner();

create trigger deneme_dersleri_touch_updated_at
  before update on public.deneme_dersleri
  for each row execute function public.touch_updated_at();
