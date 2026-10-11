-- ═══════════════════════════════════════════════════════════════════
-- 0027 — Rutin kategorisi
--
-- Rutinler, görevlerle AYNI `categories` tablosuna bağlanır (0008).
-- Ayrı bir "rutin kategorisi" tablosu açılmadı: kullanıcının dünyasında
-- "Matematik" tek bir şeydir; iki ayrı liste aynı adı iki kez yönetmek
-- ve renklerin ayrışması demekti.
--
-- `on delete set null`: kategori silinirse rutin hayatta kalır ve
-- "Kategorisiz" grubuna düşer — tasks.category_id ile aynı karar.
-- Sahiplik kontrolü için trigger YOK; gerekçe 0008'in RLS notunda
-- (başkasının kimliğini okumak RLS ile engelli, yazmak UUID tahmini
-- ister ve o durumda bile veri sızmaz).
--
-- `if not exists`: elle, tekrar çalıştırılabilir olsun.
-- ═══════════════════════════════════════════════════════════════════

alter table public.routines
  add column if not exists category_id uuid
    references public.categories (id) on delete set null;

comment on column public.routines.category_id is
  'Rutinin kategorisi (görevlerle ortak categories tablosu). null → kategorisiz.';
