-- ═══════════════════════════════════════════════════════════════════
-- 0024 — Tekrarlanan plan kalemi
--
-- Bazı kalemler bir kez yapılıp bitmez: "Paragraf rutini", "Günlük
-- 30 soru". Bunlar ağaçtan HER GÜN (ya da haftada birkaç kez) güne
-- gönderilir. Tekrarsız bir kalem güne gönderilince Planlama paneli
-- onun üstünü çiziyor (dağıtıldı); tekrarlanan bir kalemin üstü hiç
-- çizilmemeli, yanında kaç kez gönderildiği yazmalı.
--
-- ── Neden bir bayrak, bir tekrar KURALI değil? ──
-- "Her pazartesi", "haftada 3 kez" gibi bir kural rutinlerin işi ve
-- rutinler zaten var. Burada istenen yalnızca "bu kalem tükenmez"
-- bilgisi; günleri kullanıcı "Güne" panelinden (birden çok gün
-- seçerek) kendisi seçiyor.
--
-- `not null default false`: mevcut kalemlerin hepsi tekrarsız kalır.
-- `if not exists`: migration'lar append-only ve tekrar çalıştırılabilir.
-- ═══════════════════════════════════════════════════════════════════

alter table public.goal_nodes
  add column if not exists repeating boolean not null default false;

comment on column public.goal_nodes.repeating is
  'Tekrarlanan kalem: güne gönderilince tükenmez, üstü çizilmez. false → bir kez dağıtılır.';
