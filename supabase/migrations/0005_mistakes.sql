-- ═══════════════════════════════════════════════════════════════════
-- 0005 — Yanlışlar (yanlış çetelesi + tekrar takvimi)
--
-- Sınava çalışırken yapılan her yanlış soru ayrı bir kayıttır: ders,
-- konu, tarih, ekran görüntüsü ve not. Ekran bu satırlardan iki şey
-- üretir — ders/konu kırılımlı bir sayım tablosu ("çetele") ve
-- vadesi gelmiş tekrarların kuyruğu.
--
-- ── Neden tekrar durumu AYRI BİR TABLO DEĞİL, satırdaki sütunlar? ──
-- Bugün ekranının sorusu tektir: "vadesi gelmiş yanlışlar hangileri".
-- Sütunlarla bu tek index üzerinde tek turdur. Ayrı bir `reviews`
-- tablosu bunu join'e çevirir ve "hangi tekrar satırı güncel" sorusunu
-- doğurur. Ayrı tablo ancak tekrar GEÇMİŞİ (ne zaman yapıldı, doğru
-- bilindi mi) istenirse kazanır; istenen bir kontrol listesidir.
-- Geçmiş sonradan gerekirse, sütunların YANINA append-only bir log
-- eklenir; sütunlar hızlı okuma yolu olarak kalır.
--
-- ── Neden ders/konu serbest metin, ayrı bir `subjects` tablosu yok? ──
-- Kullanıcı ayrı bir ders yönetim ekranı istemedi. Otomatik tamamlama
-- geçmiş değerlerden türetilir; ayrı tablo, kullanılmayan bir yönetim
-- yüzeyi ve her yanlış kaydında bir "önce dersi tanımla" adımı
-- doğururdu. Yazım tutarsızlığı istemcide normalleştirme ile çözülür
-- (bkz. src/lib/text/normalize.ts — "matematik" ve "MATEMATİK"
-- çetelede tek satırdır).
-- ═══════════════════════════════════════════════════════════════════

create table public.mistakes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,

  -- Çetelenin birinci kırılım ekseni.
  ders       text not null check (length(trim(ders)) between 1 and 60),

  -- İkinci eksen. Zorunludur: konusuz bir yanlış çetelede "diğer"
  -- kovasına düşer ve tekrar edilebilir bir çalışma birimi olmaz.
  konu       text not null check (length(trim(konu)) between 1 and 80),

  -- Yanlışın yapıldığı gün. `created_at` DEĞİL: dün çözülen bir
  -- denemenin yanlışları bugün girilebilir ve dünle ilişkilendirilmeli.
  -- (0004'teki `notes.date` ile aynı gerekçe.)
  date       date not null default ((now() at time zone 'Europe/Istanbul')::date),

  note       text check (note is null or length(note) <= 2000),

  -- Storage'daki nesnenin yolu: `<user_id>/<uuid>.webp`.
  -- İMZALI URL SAKLANMAZ — süresi dolar ve satırı çöpe çevirirdi.
  -- Nullable: ekran görüntüsü olmadan da yanlış kaydedilebilmeli.
  image_path text check (image_path is null or length(image_path) <= 200),

  -- Yükleme anında ölçülür. Amaç layout shift'i önlemek: <img>
  -- boyutu bilinmeden yerleştirilirse liste her görsel yüklendiğinde
  -- zıplar. İskelet kutusu da bu orandan kurulur.
  image_width  smallint check (image_width is null or image_width > 0),
  image_height smallint check (image_height is null or image_height > 0),

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
  constraint review_state_consistent
    check ((review_stage = 4) = (next_review_date is null))
);

comment on table public.mistakes is
  'Sınav çalışmasında yapılan yanlışlar. Ders/konu kırılımlı çetele ve '
  'aralıklı tekrar kuyruğu bu satırlardan türetilir.';
comment on column public.mistakes.date is
  'Yanlışın yapıldığı gün; kaydedildiği an değil.';
comment on column public.mistakes.image_path is
  'Storage yolu (<user_id>/<uuid>.webp). İmzalı URL saklanmaz.';
comment on column public.mistakes.review_stage is
  'Tamamlanan tekrar sayısı (0..4). 4 = mezun.';
comment on column public.mistakes.next_review_date is
  'Sonraki tekrarın vadesi. null ⇔ mezun.';

-- Ekranın tek sorgu şekli: kullanıcının tüm yanlışları, tarihe göre
-- yeniden eskiye. Çetele İSTEMCİDE bu listeden hesaplanır; ayrı bir
-- toplama sorgusu yoktur, dolayısıyla ayrı bir index de gerekmez.
create index mistakes_user_date_idx
  on public.mistakes (user_id, date desc, created_at desc);

-- Bugün ekranının tekrar kuyruğu. Kısmi index: mezun olmuş satırlar
-- (next_review_date null) zamanla çoğunluğu oluşturur ve bu sorguyu
-- asla ilgilendirmez — index'in dışında tutmak onu küçük tutar.
create index mistakes_due_idx
  on public.mistakes (user_id, next_review_date)
  where next_review_date is not null;

-- ─────────────────────────────── RLS ────────────────────────────────
alter table public.mistakes enable row level security;

create policy mistakes_select on public.mistakes
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy mistakes_insert on public.mistakes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy mistakes_update on public.mistakes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy mistakes_delete on public.mistakes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ───────────────────────────── Trigger'lar ──────────────────────────
-- İstemci `user_id` göndermez; değer sunucuda oturumdan damgalanır.
create trigger mistakes_stamp_user_id
  before insert on public.mistakes
  for each row execute function public.stamp_user_id();

create trigger mistakes_touch_updated_at
  before update on public.mistakes
  for each row execute function public.touch_updated_at();

/**
 * İlk tekrarın vadesini damgalar: kayıttan bir gün sonra.
 *
 * Ladder'ın BAŞLANGICI veritabanında garantidir; istemcinin ilk vadeyi
 * hesaplaması gerekmez ve unutamaz. İLERLETME mantığı ise TypeScript'te
 * saf bir fonksiyondur (src/features/mistakes/review.ts) — orası test
 * edilen kısımdır ve "bugün"ü Europe/Istanbul'a göre bilmesi gerekir,
 * bu da istemcinin sorumluluğudur.
 */
create or replace function public.schedule_first_review()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.review_stage = 0 and new.next_review_date is null then
    new.next_review_date := new.date + 1;
  end if;
  return new;
end;
$$;

create trigger mistakes_schedule_first_review
  before insert on public.mistakes
  for each row execute function public.schedule_first_review();

-- ═══════════════ Storage: yanlış ekran görüntüleri ══════════════════
--
-- Bucket ÖZELDİR. Herkese açık bir bucket'ta sızan bir URL kalıcı
-- olarak okunabilir; sınav sorusu görüntüleri kullanıcının özel
-- çalışma materyalidir. Okuma imzalı URL ile yapılır (1 saat).
--
-- Yol sözleşmesi: <user_id>/<uuid>.webp
-- İlk segment kullanıcı kimliğidir ve aşağıdaki politikalar bunu
-- ZORUNLU kılar — yol bir GÜVENLİK SINIRIDIR, kozmetik bir düzen değil.
--
-- `file_size_limit` sunucu tarafı emniyet kemeridir: istemci görselleri
-- yüklemeden önce WebP'ye sıkıştırır (bkz. features/mistakes/compress.ts)
-- ve tipik sonuç 250 KB altındadır. RLS boyut kontrol edemez, bu yüzden
-- sınır bucket üzerindedir.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mistakes',
  'mistakes',
  false,
  3145728, -- 3 MB
  array['image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do nothing;

-- `storage.foldername(name)` yol segmentlerini text[] olarak döner;
-- [1] ilk segmenttir (Postgres dizileri 1-tabanlıdır) ve user_id'dir.
create policy mistake_images_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'mistakes'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy mistake_images_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'mistakes'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy mistake_images_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'mistakes'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'mistakes'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy mistake_images_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'mistakes'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
