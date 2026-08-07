-- ═══════════════════════════════════════════════════════════════════
-- 0006 — Görevlere saat ve süre
--
-- İki sütun da NULL'a izin verir ve varsayılanı yoktur. Sebep: mevcut
-- görevlerin hiçbiri etkilenmemeli ve SAATSİZ GÖREV BİRİNCİ SINIF bir
-- durumdur — "bir ara yapılacak" işlerin çoğunun saati yoktur. Saat
-- verilmemişse görev düz listede kalır; gün planı yalnızca saati
-- olanlardan kurulur.
--
-- `duration_minutes` süreyi dakika olarak tutar, BİTİŞ SAATİNİ DEĞİL.
-- Bitiş saati saklamak, başlangıç kaydırıldığında iki sütunu birden
-- güncellemeyi ve gece yarısını aşan aralıkları ele almayı gerektirir;
-- süre ise kaydırmadan etkilenmez.
--
-- Tip `time`, `timestamptz` DEĞİL: "09:00" görevin `due_date`'indeki
-- duvar saatidir. supabase-js `time`'ı 'HH:MM:SS' string'i olarak
-- döndürür, yani sınırdan hiçbir `Date` nesnesi geçmez ve
-- src/lib/date/types.ts'in kuralı korunur.
--
-- Yeni index YOK: mevcut (user_id, due_date, done) index'i gün
-- sorgusunu karşılıyor ve sıralama zaten çekilmiş küçük dizide
-- istemcide yapılıyor.
-- ═══════════════════════════════════════════════════════════════════

alter table public.tasks
  add column start_time time,
  add column duration_minutes smallint
    check (duration_minutes is null or duration_minutes between 5 and 1440);

comment on column public.tasks.start_time is
  'Görevin başlangıç saati (saat dilimsiz). null → saatsiz görev.';
comment on column public.tasks.duration_minutes is
  'Süre, dakika. Bitiş saati bundan türetilir; ayrıca saklanmaz.';

-- Süre, saat olmadan anlamsızdır: "45 dakika ama ne zaman?" bir plan
-- değildir.
alter table public.tasks
  add constraint task_duration_needs_start
  check (duration_minutes is null or start_time is not null);
