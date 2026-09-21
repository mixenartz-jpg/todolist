-- ═══════════════════════════════════════════════════════════════════
-- 0020 — Yanlış görselleri için storage bucket'ı
--
-- ── Neden YENİ bir bucket adı, eski `mistakes` DEĞİL? ──
-- 0005 `mistakes` adında bir bucket açmıştı ve 0016 onu kaldırmaya
-- çalıştı — ama YALNIZCA POLİTİKALARI düşürebildi. Kendi yorumunda
-- yazılı (0016:49-69): Supabase `storage.objects` üzerinde
-- `storage.protect_delete()` trigger'ı tutuyor ve SQL'den doğrudan
-- silmeyi reddediyor:
--
--   ERROR 42501: Direct deletion from storage tables is not allowed.
--
-- Yani eski bucket panelden elle silinmediyse DOSYALARI HÂLÂ ORADA.
-- Aynı adı yeniden kullanmak, o yetim nesneleri yeni politikaların
-- altında yeniden görünür kılardı: silindiğini sandığımız görseller
-- geri gelirdi. Yeni ad temiz bir sınırdır.
--
-- ── Bucket neden ÖZEL? ──
-- Herkese açık bir bucket'ta sızan bir URL kalıcı olarak okunabilir.
-- Sınav sorusu görüntüleri kullanıcının özel çalışma materyalidir ve
-- üzerinde el yazısı notları olabilir. Okuma İMZALI URL ile yapılır.
--
-- ── Yol sözleşmesi: <user_id>/<uuid>.webp ──
-- İlk segment kullanıcı kimliğidir ve aşağıdaki politikalar bunu
-- ZORUNLU kılar — yol bir GÜVENLİK SINIRIDIR, kozmetik bir düzen
-- değil. `storage.foldername(name)` segmentleri text[] olarak döner
-- ve [1] ilkidir (Postgres dizileri 1-tabanlı).
--
-- ── `file_size_limit` neden var? ──
-- Sunucu tarafı emniyet kemeri. İstemci görselleri yüklemeden önce
-- WebP'ye sıkıştırır (features/deneme/compress.ts) ve tipik sonuç
-- 250 KB altındadır. RLS boyut kontrol EDEMEZ, bu yüzden sınır
-- bucket üzerindedir.
-- ═══════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deneme-gorselleri',
  'deneme-gorselleri',
  false,
  3145728, -- 3 MB
  array['image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do nothing;

create policy deneme_gorsel_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'deneme-gorselleri'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy deneme_gorsel_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'deneme-gorselleri'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy deneme_gorsel_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'deneme-gorselleri'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'deneme-gorselleri'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy deneme_gorsel_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'deneme-gorselleri'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
