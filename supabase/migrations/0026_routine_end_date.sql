-- ═══════════════════════════════════════════════════════════════════
-- 0026 — Rutinin bitiş tarihi
--
-- Rutinler bugüne kadar SÜRESİZDİ: bir kez eklenen rutin, arşivlenene
-- kadar her gün/hafta zorunlu kalıyordu. Kullanıcı "bu hafta her gün
-- 50 paragraf" gibi DÖNEMLİK rutinler istiyor; hafta bitince rutin
-- kendiliğinden durmalı, elle arşivlemek gerekmemeli.
--
-- ── Neden archived_at'i ileri tarihli yazmak değil? ──
-- Arşiv "vazgeçtim" demek ve ekranda ayrı bir bölüme taşınıyor; ayrıca
-- timestamptz. Bitiş tarihi ise PLANIN parçası: rutin oluşturulurken
-- bilinir, değiştirilebilir, ve DAHİL bir gündür (o gün hâlâ zorunlu).
--
-- null → süresiz (mevcut rutinlerin hepsi).
-- `if not exists`: elle, tekrar çalıştırılabilir olsun.
-- ═══════════════════════════════════════════════════════════════════

alter table public.routines
  add column if not exists end_date date;

alter table public.routines
  drop constraint if exists routines_end_after_start;
alter table public.routines
  add constraint routines_end_after_start
    check (end_date is null or end_date >= start_date);

comment on column public.routines.end_date is
  'Rutinin zorunlu olduğu SON gün (dahil). null → süresiz. Sonrası istatistikleri bozmaz.';
