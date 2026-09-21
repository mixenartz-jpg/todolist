-- ═══════════════════════════════════════════════════════════════════
-- 0016 — Sadeleştirme: saat sütunları + Defter tabloları düşer
--
-- GERİ DÖNÜŞÜ YOKTUR. Bu migration veri siler, sütun düşürür ve bir
-- storage bucket'ını boşaltır. Çalıştırmadan önce yedek alınmalıdır.
--
-- ── Neden kod ÖNCE, migration SONRA? ──
-- Ters sıra sessizce kırardı: `select("*")` düşmüş bir sütunu
-- döndürmez, `toTask()` `undefined` atar, `Task.startTime` tipi yalan
-- söyler ve HİÇBİR derleme hatası oluşmaz. Uygulama çalışır, yalnızca
-- yanlış çalışır. Bu yüzden saat mantığı önce sökülmüş (F6), tip
-- daraltması da bu migration ile AYNI commit'tedir.
--
-- ── `day_notes` DEĞİL `notes` ──
-- İkisi farklı tablolardır ve 0004'ün ilk 17 satırı bu ayrımı yazar:
--
--   day_notes : gün başına BİR kayıt, "bugün nasıl geçti". Bugün
--               ekranının parçası ve HAYATTA KALIYOR.
--   notes     : serbest defter, silinen sekmenin tablosu.
--
-- Yanlış tabloyu düşürmek tüm günlük plan ve değerlendirme verisini
-- silerdi. Aşağıda yalnızca `public.notes` düşüyor.
--
-- `if exists` her yerde: migration'lar append-only ve bu dosya bir
-- kereden fazla çalıştırılabilmeli.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Saat ve süre ────────────────────────────────────────────────
-- Kısıt ÖNCE düşer: sütunları tutan o ve sütunlarla birlikte otomatik
-- düşecek olsa da, sırayı açıkça yazmak niyeti belgeliyor.
alter table public.tasks
  drop constraint if exists task_duration_needs_start;

alter table public.tasks
  drop column if exists duration_minutes,
  drop column if exists start_time;

-- `tasks_user_due_idx` DOKUNULMAZ: (user_id, due_date, done) üzerinde
-- ve gün sorgusunu hâlâ o karşılıyor. Saat sütunları index'e hiç
-- girmemişti (0006: "Yeni index YOK").

-- ── 2. Defter tabloları ────────────────────────────────────────────
-- `cascade`: RLS politikaları, index'ler ve FK'ler tabloyla birlikte
-- düşsün. İkisine de hiçbir yerden FK verilmemişti, yani cascade
-- başka bir tabloyu etkilemez.
drop table if exists public.notes cascade;
drop table if exists public.mistakes cascade;

-- ── 3. Yanlış görselleri (storage) ─────────────────────────────────
-- SIRA ÖNEMLİ: önce nesneler, sonra politikalar, en sonra bucket.
-- Bucket'ı dolu iken silmek FK hatası verir.
--
-- Bucket kimliği 'mistakes' — 'mistake-images' DEĞİL (bkz. 0005:
-- `insert into storage.buckets ... values ('mistakes', ...)`).
-- Politika ADLARI `mistake_images_*` ama bucket'ın kendisi değil.
delete from storage.objects where bucket_id = 'mistakes';

drop policy if exists mistake_images_select on storage.objects;
drop policy if exists mistake_images_insert on storage.objects;
drop policy if exists mistake_images_update on storage.objects;
drop policy if exists mistake_images_delete on storage.objects;

delete from storage.buckets where id = 'mistakes';

-- ── 4. Ölü bölüm başlıkları ────────────────────────────────────────
-- Bu üç anahtar artık hiçbir ekranda çizilmiyor (Defter ile birlikte
-- kalktılar). Satırlar zararsız ama 0007'nin kuralı "yazılmamış
-- anahtar = varsayılan" — kullanılmayan bir anahtarı taşımak, ileride
-- aynı adı başka bir bölüme veren birinin eski başlığı miras almasına
-- yol açardı.
delete from public.section_labels
  where key in ('today.review', 'today.journal', 'today.reviewStats');
