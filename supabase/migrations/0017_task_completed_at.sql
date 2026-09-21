-- ═══════════════════════════════════════════════════════════════════
-- 0017 — Görevin BİTTİĞİ an
--
-- Arşiv "hangi gün ne bitirdim" sorusunu cevaplıyor ve o soruyu
-- `due_date` cevaplayamaz: dün için planlanıp bugün bitirilen bir iş
-- `due_date`'e göre DÜNE düşer ve arşiv, o günü yapılmamış gösterirken
-- bugünü boş gösterir. İki gün birden yalan söyler.
--
-- ── Neden `timestamptz`? ──
-- `date` yeterli görünüyor ama değil: kullanıcı gece 00:30'da bir iş
-- bitirdiğinde bunun hangi güne yazılacağı bir ARAYÜZ kararı ve
-- sunucunun saat dilimine bırakılamaz. Tam damga saklanıp gün
-- istemcide türetiliyor — `src/lib/date/types.ts`'in "sınırdan Date
-- geçmez" kuralıyla tutarlı: damga string olarak geliyor, gün
-- hesabı saf fonksiyonda yapılıyor.
--
-- ── Geriye dönük değer YAZILMIYOR ──
-- `done = true` olan mevcut satırlar `completed_at = null` kalıyor.
-- `updated_at`'i kopyalamak cazip ama yalan olurdu: o sütun her
-- güncellemede değişiyor ve bir görevin adını dün değiştirmiş olmak,
-- onu dün bitirmiş olmak demek değil. Bilmediğimiz bir zamanı
-- uydurmak arşivi yalancı yapar; eski görevler `due_date`'ine düşer
-- ve bu, arşivin kendi kuralında yazılı (bkz. `archive.ts`).
-- ═══════════════════════════════════════════════════════════════════

alter table public.tasks
  add column if not exists completed_at timestamptz;

comment on column public.tasks.completed_at is
  'Görevin tamamlandığı an. null → hiç tamamlanmadı ya da 0017 öncesinde tamamlandı (gün due_date''ten türetilir).';

-- ── Kısmi index ────────────────────────────────────────────────────
-- Arşiv yalnızca BİTMİŞ görevleri, en yeniden eskiye doğru okuyor.
-- `where completed_at is not null` index'i küçük tutuyor: açık
-- görevler (çoğunluk) hiç girmiyor.
--
-- `tasks_user_due_idx` DOKUNULMUYOR — gün sorgusunu hâlâ o karşılıyor
-- ve bu index onun yerine geçmiyor, yanına ekleniyor.
create index if not exists tasks_user_completed_idx
  on public.tasks (user_id, completed_at desc)
  where completed_at is not null;
