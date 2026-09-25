-- ═══════════════════════════════════════════════════════════════════
-- 0023 — Görevin TAHMİNİ süresi
--
-- "Bu iş yaklaşık ne kadar sürer?" — satırın sağında "30 dak",
-- "2 saat" diye görünen çip. Planlarken bir günün kaldırıp
-- kaldıramayacağını görmenin en kısa yolu.
--
-- ── 0006'nın `duration_minutes`'ı GERİ GELMİYOR ──
-- O sütun bir BAŞLANGIÇ SAATİNE bağlıydı (`task_duration_needs_start`)
-- ve saat ızgarasının bloğunun boyunu çiziyordu; 0016 ızgarayla
-- birlikte düşürdü. Bu sütun saatsizdir: bir TAHMİN, takvimde bir yer
-- değil. Ad bu yüzden farklı — eski adı geri getirmek, düşen saat
-- mantığının da döndüğünü ima ederdi.
--
-- ── Neden dakika, `interval` DEĞİL? ──
-- Arayüz yalnızca dakika konuşuyor ve `smallint` supabase-js'e düz
-- number gelir; `interval` bir string olarak gelir ve istemcide
-- ayrıştırılması gerekirdi.
--
-- Üst sınır bir gün (1440): bir görevin tahmini bir günü aşıyorsa o
-- bir görev değil, parçalanması gereken bir hedeftir (bkz. 0022).
--
-- `if not exists`: migration'lar append-only ve bu dosya bir
-- kereden fazla çalıştırılabilmeli.
-- ═══════════════════════════════════════════════════════════════════

alter table public.tasks
  add column if not exists estimate_minutes smallint
    check (estimate_minutes is null or estimate_minutes between 1 and 1440);

comment on column public.tasks.estimate_minutes is
  'Görevin tahmini süresi, dakika. null → tahmin girilmedi. Saatten bağımsızdır (0006''nın duration_minutes''ı değil).';
