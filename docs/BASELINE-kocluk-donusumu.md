# Baseline — Koçluk Dönüşümü (F0)

Plan: `C:\Users\kerem\.claude\plans\site-art-k-ok-kar-k-memoized-cosmos.md`
Dal: `kocluk-donusumu` · Başlangıç commit'i: (aşağıda)
Tarih: 2026-09-20

Bu dosya F16'daki karşılaştırma için var. Silme işlerinin kapsamı
düşürüp düşürmediği ancak buna bakılarak söylenebilir.

## Testler

```
45 test dosyası, 722 test — HEPSİ GEÇİYOR (`npm test`)
```

## Kapsam (`npm run test:coverage`) — EŞİK ZATEN KIRIK

| Ölçüt | Değer | Eşik | Durum |
|---|---|---|---|
| Statements | 74.30% (1157/1557) | — | — |
| Branches | 75.11% (797/1061) | 75 | ✓ kıl payı |
| Functions | 70.60% (233/330) | 80 | ✗ |
| Lines | 73.61% (968/1315) | 80 | ✗ |

**Yorum:** `npm test` geçiyor, kırık olan yalnızca `test:coverage`.
Kapsamı aşağı çeken en büyük kütle `features/daygrid` — 6 hook tamamen
%0 kapsamda (837 satır). Onlar silinince eşik yükselmeli.
Buna karşı `features/mistakes` ve `features/journal` %100 kapsamda;
silinmeleri kapsamı AŞAĞI çeker. Net etkiyi F2 sonunda ölç.

En kırılgan ölçüt **branches**: eşiğe 0.11 puan uzakta.

## Typecheck

```
tsc --noEmit — temiz
```

## Silinecek kütle (keşif ölçümü)

| Alan | Dosya | Satır |
|---|---|---|
| `features/mistakes/` | 32 | 4528 |
| `features/daygrid/` | 24 | 3482 |
| `features/taskpopover/` | 10 | 1430 |
| `features/journal/` | 8 | 1177 |
| `features/calendar/` | 6 | 624 |
| `features/week/` | 6 | 558 |
| `app/(app)/defter/` | 5 | ~100 |
| `app/(app)/takvim/` | 6 | ~60 |
| **Toplam** | **~97** | **~11.900** |
