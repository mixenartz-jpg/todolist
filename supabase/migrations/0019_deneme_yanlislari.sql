-- ═══════════════════════════════════════════════════════════════════
-- 0019 — Deneme yanlışları (fotoğraflı yanlış defteri + tekrar kuyruğu)
--
-- ── Bu tablo bir DİRİLİŞ ──
-- 0005 `mistakes` tablosu tam olarak bu işi yapıyordu: ders/konu
-- kırılımlı yanlış çetelesi, ekran görüntüsü ve aralıklı tekrar.
-- 0016 onu düşürdü. Şimdi geri geliyor ama AYNI HÂLİYLE DEĞİL:
--
--   0005 `mistakes`      : SERBEST çetele, denemeden bağımsız
--   0019 bu tablo        : DENEMENİN ÇOCUĞU
--
-- Fark kullanıcının istediği şeyden doğuyor: "o denemeye basınca o
-- denemede yanlış yaptığım soruların fotoğrafları". Serbest çetelede
-- bir yanlışın hangi denemeden geldiği yazılı değildi; ders ve konu
-- vardı ama oturum yoktu. `deneme_id` zorunlu olunca deneme detayı
-- tek sorguyla kendi yanlışlarını getirir.
--
-- 0005'ten AYNEN korunan kararlar (gerekçeleri orada yazılı ve hâlâ
-- geçerli): görsel yolu saklanır imzalı URL değil; görsel ölçüsü
-- layout shift için kolonda tutulur; `review_stage` TAMAMLANAN tekrar
-- sayısıdır, "hangi aralık" değil.
-- ═══════════════════════════════════════════════════════════════════

create table public.deneme_yanlislari (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,

  -- Denemenin çocuğu. `on delete cascade`: deneme silinince
  -- yanlışları da gider — yetim bir yanlış hangi sınavdan geldiğini
  -- söyleyemez ve tekrar kuyruğunda bağlamsız bir kart olurdu.
  deneme_id  uuid not null references public.denemeler (id) on delete cascade,

  -- Ders zorunlu: yanlış en azından bir derse ait olmalı, yoksa
  -- çetelede "diğer" kovasına düşer.
  ders       text not null check (length(trim(ders)) between 1 and 60),

  -- ── Konu neden ZORUNLU DEĞİL (0005'ten AYRILIYOR)? ──
  -- 0005'te konu `not null` idi ve gerekçesi "konusuz yanlış tekrar
  -- edilebilir bir çalışma birimi olmaz" idi. Doğru, ama akışı
  -- kırıyor: deneme biter bitmez yanlışlar fotoğraflanır ve o anda
  -- hangi konuya ait oldukları çoğu zaman BİLİNMEZ — bilmek için
  -- soruyu yeniden çözmek gerekir.
  --
  -- Alan araştırmasının en net bulgusu buydu: etiketleme AYRI BİR
  -- OTURUMUN işidir ("bu soruyu şimdi çözebiliyor muyum?"). Konuyu
  -- zorunlu kılmak, kullanıcıyı kayıt anında uydurmaya iter ve
  -- çeteleyi kirletir. null = "henüz etiketlenmedi", meşru bir durum.
  konu       text check (konu is null or length(trim(konu)) between 1 and 80),

  -- Sorunun deneme kitapçığındaki numarası. İsteğe bağlı.
  soru_no    smallint check (soru_no is null or soru_no between 1 and 200),

  -- ── Hata türü ──
  -- Alan araştırmasının en tutarlı kelime dağarcığı; ciddi her
  -- kaynakta aynı beş kova çıkıyor ve hepsi EYLEME dönüşür:
  --   bilgi     → konuya dön, baştan çalış
  --   islem     → biliyorum ama yanlış uyguladım; adım adım yazma
  --   dikkat    → soru kökünü yanlış okudum; altını çizme rutini
  --   sure      → yapardım, yetmedi; hız antrenmanı
  --   strateji  → zor soruda takıldım, kolayı atladım; atlama kuralı
  --
  -- null = henüz etiketlenmedi. `konu` ile aynı gerekçe: etiket
  -- sonraki oturumda, soruyu yeniden çözerken verilir.
  hata_turu  text check (hata_turu is null or hata_turu in
               ('bilgi', 'islem', 'dikkat', 'sure', 'strateji')),

  note       text check (note is null or length(note) <= 2000),

  -- ── Görsel (0005'ten aynen) ──
  -- Storage'daki nesnenin yolu: `<user_id>/<uuid>.webp`.
  -- İMZALI URL SAKLANMAZ — süresi dolar ve satırı çöpe çevirirdi.
  -- Nullable: fotoğrafsız da yanlış kaydedilebilmeli.
  image_path text check (image_path is null or length(image_path) <= 200),

  -- Yükleme anında ölçülür. Amaç layout shift'i önlemek: <img>
  -- boyutu bilinmeden yerleştirilirse ızgara her görsel yüklendiğinde
  -- zıplar. İskelet kutusu da bu orandan kurulur.
  image_width  smallint check (image_width is null or image_width > 0),
  image_height smallint check (image_height is null or image_height > 0),

  -- ── Aralıklı tekrar (0005'ten aynen) ──
  -- TAMAMLANAN tekrar sayısı — "hangi aralık" DEĞİL. 0 = kaydedildi,
  -- hiç tekrar edilmedi. 4 = mezun oldu. Bu kodlama sayesinde
  -- "sonraki vade = tekrar günü + ARALIKLAR[stage]" temiz bir total
  -- fonksiyondur ve "mezun" sadece stage = 4 demektir.
  review_stage smallint not null default 0 check (review_stage between 0 and 4),

  -- Vadesi gelen tekrar günü. null ⇔ mezun oldu, bir daha sorulmaz.
  next_review_date date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- İki sütun tek bir durumu kodlar; ayrışmaları "mezun ama vadesi
  -- var" gibi anlamsız satırlar üretirdi.
  constraint yanlis_review_state_consistent
    check ((review_stage = 4) = (next_review_date is null))
);

comment on table public.deneme_yanlislari is
  'Bir denemede yapılan yanlışlar: fotoğraf, hata türü, tekrar kuyruğu.';
comment on column public.deneme_yanlislari.konu is
  'null = henüz etiketlenmedi; etiketleme ayrı bir oturumun işidir.';
comment on column public.deneme_yanlislari.hata_turu is
  'bilgi/islem/dikkat/sure/strateji. null = henüz etiketlenmedi.';
comment on column public.deneme_yanlislari.image_path is
  'Storage yolu (<user_id>/<uuid>.webp). İmzalı URL saklanmaz.';
comment on column public.deneme_yanlislari.review_stage is
  'Tamamlanan tekrar sayısı (0..4). 4 = mezun.';

-- Deneme detayının tek sorgu şekli: bu denemenin yanlışları.
-- FK index'i de budur.
create index deneme_yanlislari_deneme_idx
  on public.deneme_yanlislari (deneme_id, created_at);

-- Bugün ekranının tekrar kuyruğu. KISMİ index: mezun olmuş satırlar
-- (next_review_date null) zamanla çoğunluğu oluşturur ve bu sorguyu
-- asla ilgilendirmez — index'in dışında tutmak onu küçük tutar.
create index deneme_yanlislari_due_idx
  on public.deneme_yanlislari (user_id, next_review_date)
  where next_review_date is not null;

-- Etiketlenmeyi bekleyenler: "denemeyi girdim, şimdi yanlışları
-- etiketleyeyim" akışı. Kısmi index aynı gerekçeyle: etiketlenmiş
-- satırlar zamanla çoğunluk olur ve bu sorguya girmez.
create index deneme_yanlislari_etiketsiz_idx
  on public.deneme_yanlislari (user_id, created_at)
  where hata_turu is null;

-- ─────────────────────────────── RLS ────────────────────────────────

alter table public.deneme_yanlislari enable row level security;

create policy deneme_yanlislari_select on public.deneme_yanlislari
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy deneme_yanlislari_insert on public.deneme_yanlislari
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy deneme_yanlislari_update on public.deneme_yanlislari
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy deneme_yanlislari_delete on public.deneme_yanlislari
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ───────────────────────────── Trigger'lar ──────────────────────────

/**
 * Sahibi ve ilk tekrar vadesini TEK turda damgalar.
 *
 * ── Neden iki ayrı trigger DEĞİL? ──
 * İlk hâli iki trigger'dı: biri sahibi denemeden devralıyor, diğeri
 * ilk vadeyi yazıyordu. İkisi de `before insert` ve Postgres aynı
 * zamanlı trigger'ları ADIYLA ALFABETİK sırayla çalıştırıyor —
 * `..._schedule_first_review` < `..._stamp_owner` olduğu için vade,
 * sahiplik DOĞRULANMADAN ÖNCE hesaplanıyordu.
 *
 * Bugün zararsızdı (sahiplik kontrolü yine de aynı deyimde patlayıp
 * her şeyi geri alıyordu) ama TESADÜFEN öyleydi: birini yeniden
 * adlandıran ya da araya üçüncü bir trigger sokan herhangi bir
 * migration sessizce sırayı bozabilirdi. Tek fonksiyon, sıraya
 * bağımlılığı tamamen ortadan kaldırır.
 *
 * ── Denemeyi neden TEK sorguda okuyor? ──
 * İki fonksiyon aynı satırı iki kez okuyordu (`user_id` için bir,
 * `tarih` için bir). Birleşince tek `select` ikisini de getiriyor.
 *
 * ── Sahiplik nasıl garanti? ──
 * `security invoker`: sorgu çağıranın RLS'i altında çalışır. Başka
 * kullanıcının denemesinin kimliği gönderilirse `select` SIFIR satır
 * döner, `new.user_id` null olur ve istisna atılır. İstemcinin
 * gönderdiği uydurma bir `user_id` de burada KOŞULSUZ ezilir:
 * `select ... into` eşleşme yoksa hedefe null atar, eski değeri
 * korumaz.
 *
 * ── Vade neden denemenin tarihinden? ──
 * 0005'te vade `mistakes.date + 1` idi ve o tablonun kendi tarihi
 * vardı. Burada yanlışın kendi tarihi YOK — denemeninkini kullanır.
 * Ayrı bir tarih taşısaydı ikisi ayrışabilir ve "dünkü denemenin
 * bugün girilen yanlışı" hangi güne ait olurdu sorusu doğardı.
 *
 * Ladder'ın BAŞLANGICI veritabanında garantidir; istemcinin ilk
 * vadeyi hesaplaması gerekmez ve unutamaz. İLERLETME mantığı ise
 * TypeScript'te saf bir fonksiyondur (features/deneme/review.ts) —
 * orası test edilen kısımdır ve "bugün"ü Europe/Istanbul'a göre
 * bilmesi gerekir, bu da istemcinin sorumluluğudur.
 */
create or replace function public.stamp_yanlis_owner_and_schedule()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  deneme_tarihi date;
begin
  select d.user_id, d.tarih
    into new.user_id, deneme_tarihi
  from public.denemeler d
  where d.id = new.deneme_id;

  if new.user_id is null then
    raise exception 'Deneme bulunamadı: %', new.deneme_id;
  end if;

  -- İlk vade yalnızca yeni doğan satıra yazılır. İstemci açıkça bir
  -- vade gönderdiyse (içe aktarma, düzeltme) ona dokunulmaz.
  if new.review_stage = 0 and new.next_review_date is null then
    new.next_review_date := deneme_tarihi + 1;
  end if;

  return new;
end;
$fn$;

create trigger deneme_yanlislari_stamp_and_schedule
  before insert on public.deneme_yanlislari
  for each row execute function public.stamp_yanlis_owner_and_schedule();

create trigger deneme_yanlislari_touch_updated_at
  before update on public.deneme_yanlislari
  for each row execute function public.touch_updated_at();
