import { compareDates, startOfIsoWeek } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { normalize } from "@/lib/text/normalize";
import type { Mistake } from "./types";

export interface KonuTally {
  /** Gösterilecek etiket: en son kullanılan yazım. */
  konu: string;
  week: number;
  total: number;
}

export interface DersTally {
  ders: string;
  week: number;
  total: number;
  konular: KonuTally[];
}

/**
 * Ders → konu kırılımlı sayım tablosu ("çetele").
 *
 * ── Neden istemcide? ──
 * Liste zaten tamamen çekiliyor (alttaki yanlış listesi için). Postgres
 * view'ı ya da RPC, elde olan veriden türetilebilen bir şey için İKİNCİ
 * bir ağ turu demek olurdu. Birkaç bin satırda bu indirgeme milisaniye
 * sürer — `features/stats/aggregate.ts` aynı gerekçeyle aynı kararı
 * veriyor.
 *
 * ── Yazım tutarsızlığı ──
 * Gruplama anahtarı `normalize()`'dan geçer: "matematik", "Matematik" ve
 * "MATEMATİK" tek satırda birleşir. Serbest metin ders girişini tolere
 * edilebilir kılan tek şey budur. Gösterilen etiket EN SON kullanılan
 * yazımdır — girdi yeniden eskiye sıralı geldiği için ilk görülen
 * yazım kazanır ve sonrakiler etiketi ezmez.
 *
 * ── "Bu hafta" ISO haftadır ──
 * Pazartesi başlar; `today - 7` DEĞİL. Kayan yedi günlük pencere,
 * "bu hafta kaç yanlış yaptım" sorusuna Pazartesi sabahı geçen haftanın
 * Salı'sını da katarak yanlış cevap verirdi.
 *
 * Sıralama toplam sayıya göre azalandır — en çok takılınan konu en
 * üstte olmalı, tablonun varlık sebebi budur. Beraberlikler
 * normalleştirilmiş etikete göre bozulur; aksi halde tablo her yeniden
 * çizimde yer değiştirir.
 */
export function buildTally(
  mistakes: readonly Mistake[],
  today: DateStr,
): DersTally[] {
  const weekStart = startOfIsoWeek(today);

  interface KonuAcc {
    label: string;
    week: number;
    total: number;
  }
  interface DersAcc {
    label: string;
    week: number;
    total: number;
    konular: Map<string, KonuAcc>;
  }

  const dersler = new Map<string, DersAcc>();

  // Yeniden eskiye dolaş: ilk görülen yazım en yenisidir ve etiket
  // olarak kalır.
  const ordered = [...mistakes].sort((a, b) => compareDates(b.date, a.date));

  for (const mistake of ordered) {
    const inWeek = compareDates(mistake.date, weekStart) >= 0 ? 1 : 0;

    const dersKey = normalize(mistake.ders.trim());
    let ders = dersler.get(dersKey);
    if (!ders) {
      ders = {
        label: mistake.ders.trim(),
        week: 0,
        total: 0,
        konular: new Map(),
      };
      dersler.set(dersKey, ders);
    }
    ders.week += inWeek;
    ders.total += 1;

    const konuKey = normalize(mistake.konu.trim());
    let konu = ders.konular.get(konuKey);
    if (!konu) {
      konu = { label: mistake.konu.trim(), week: 0, total: 0 };
      ders.konular.set(konuKey, konu);
    }
    konu.week += inWeek;
    konu.total += 1;
  }

  return [...dersler.entries()]
    .map(([key, ders]) => ({
      key,
      ders: ders.label,
      week: ders.week,
      total: ders.total,
      konular: [...ders.konular.entries()]
        .map(([konuKey, konu]) => ({
          key: konuKey,
          konu: konu.label,
          week: konu.week,
          total: konu.total,
        }))
        .sort(byTotalThenKey)
        .map(({ konu, week, total }) => ({ konu, week, total })),
    }))
    .sort(byTotalThenKey)
    .map(({ ders, week, total, konular }) => ({ ders, week, total, konular }));
}

function byTotalThenKey(
  a: { total: number; key: string },
  b: { total: number; key: string },
): number {
  if (a.total !== b.total) return b.total - a.total;
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

/**
 * Seçili ders/konuya göre süzer.
 *
 * Karşılaştırma normalleştirilmiş biçimde yapılır: çetelede tek satırda
 * birleşen farklı yazımlar, süzmede de birlikte gelmelidir.
 */
export function filterBySelection(
  mistakes: readonly Mistake[],
  selection: { ders: string; konu: string } | null,
): Mistake[] {
  if (!selection) return [...mistakes];

  const ders = normalize(selection.ders.trim());
  const konu = normalize(selection.konu.trim());

  return mistakes.filter(
    (m) => normalize(m.ders.trim()) === ders && normalize(m.konu.trim()) === konu,
  );
}
