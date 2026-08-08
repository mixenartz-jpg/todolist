import { compareDates, startOfIsoWeek } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { normalize } from "@/lib/text/normalize";
import { isDue, toReviewState } from "./review";
import type { Mistake } from "./types";

/** Yoğunluk rampasındaki adım (`--color-level-0..4`). */
export type Heat = 0 | 1 | 2 | 3 | 4;

export interface KonuNode {
  /** Normalleştirilmiş konu anahtarı — sıralama beraberliklerini bozar. */
  key: string;
  /**
   * Açık/kapalı durum kimliği; ders bağlamını içerir.
   *
   * "Türev" hem Matematik hem Fizik altında olabilir: yalnız `key`
   * kullanmak birini açtığında diğerini de açardı.
   */
  nodeKey: string;
  /** Gösterilecek etiket: en son kullanılan yazım. */
  konu: string;
  week: number;
  total: number;
  /** Vadesi gelmiş (geçmiş dahil) tekrar sayısı. */
  dueCount: number;
  heat: Heat;
  /** Yeniden eskiye sıralı. */
  mistakes: Mistake[];
}

export interface DersNode {
  key: string;
  /** Açık/kapalı durum kimliği; konu anahtarlarıyla çakışmaz. */
  nodeKey: string;
  ders: string;
  week: number;
  total: number;
  /** Konularının toplamı. */
  dueCount: number;
  heat: Heat;
  konular: KonuNode[];
}

/**
 * Ders → konu → yanlış ağacı.
 *
 * ── Neden istemcide? ──
 * Liste zaten tamamen çekiliyor. Postgres view'ı ya da RPC, elde olan
 * veriden türetilebilen bir şey için İKİNCİ bir ağ turu demek olurdu.
 * Birkaç bin satırda bu indirgeme milisaniye sürer —
 * `features/stats/aggregate.ts` aynı gerekçeyle aynı kararı veriyor.
 *
 * ── Yazım tutarsızlığı ──
 * Gruplama anahtarı `normalize()`'dan geçer: "matematik", "Matematik" ve
 * "MATEMATİK" tek dalda birleşir. Serbest metin ders girişini tolere
 * edilebilir kılan tek şey budur. Gösterilen etiket EN SON kullanılan
 * yazımdır — girdi yeniden eskiye dolaşıldığı için ilk görülen yazım
 * kazanır ve sonrakiler etiketi ezmez.
 *
 * ── "Bu hafta" ISO haftadır ──
 * Pazartesi başlar; `today - 7` DEĞİL. Kayan yedi günlük pencere,
 * "bu hafta kaç yanlış yaptım" sorusuna Pazartesi sabahı geçen haftanın
 * Salı'sını da katarak yanlış cevap verirdi.
 *
 * Çıktı sırası burada BELİRLENMEZ; `sort.ts` üstlenir. Bu fonksiyon
 * yalnızca gruplar ve sayar — sıralama kullanıcının seçtiği moda göre
 * ayrıca uygulanır.
 */
export function buildTree(
  mistakes: readonly Mistake[],
  today: DateStr,
): DersNode[] {
  const weekStart = startOfIsoWeek(today);

  interface KonuAcc {
    label: string;
    week: number;
    total: number;
    dueCount: number;
    mistakes: Mistake[];
  }
  interface DersAcc {
    label: string;
    week: number;
    total: number;
    dueCount: number;
    konular: Map<string, KonuAcc>;
  }

  const dersler = new Map<string, DersAcc>();

  // Yeniden eskiye dolaş: ilk görülen yazım en yenisidir ve etiket
  // olarak kalır. Aynı zamanda her konunun `mistakes` dizisi doğal
  // olarak doğru sırada birikir — ayrıca sıralamaya gerek kalmaz.
  // Beraberlikler `id` ile bozulur ki sıra yeniden çizimlerde kararlı
  // kalsın.
  const ordered = [...mistakes].sort((a, b) => {
    const cmp = compareDates(b.date, a.date);
    if (cmp !== 0) return cmp;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  for (const mistake of ordered) {
    const inWeek = compareDates(mistake.date, weekStart) >= 0 ? 1 : 0;
    const due = isDue(toReviewState(mistake), today) ? 1 : 0;

    const dersKey = normalize(mistake.ders.trim());
    let ders = dersler.get(dersKey);
    if (!ders) {
      ders = {
        label: mistake.ders.trim(),
        week: 0,
        total: 0,
        dueCount: 0,
        konular: new Map(),
      };
      dersler.set(dersKey, ders);
    }
    ders.week += inWeek;
    ders.total += 1;
    ders.dueCount += due;

    const konuKey = normalize(mistake.konu.trim());
    let konu = ders.konular.get(konuKey);
    if (!konu) {
      konu = {
        label: mistake.konu.trim(),
        week: 0,
        total: 0,
        dueCount: 0,
        mistakes: [],
      };
      ders.konular.set(konuKey, konu);
    }
    konu.week += inWeek;
    konu.total += 1;
    konu.dueCount += due;
    konu.mistakes.push(mistake);
  }

  // Isı iki seviyede AYRI ölçeklenir. Konuları kendi dersleri içinde
  // normalleştirmek, tek konulu bir dersi otomatik olarak "en sıcak"
  // yapardı; oysa asıl soru "hangi konuya en çok takılıyorum" ve bu
  // sorunun kapsamı tüm konulardır.
  const maxDersTotal = max([...dersler.values()].map((x) => x.total));
  const maxKonuTotal = max(
    [...dersler.values()].flatMap((x) => [...x.konular.values()].map((k) => k.total)),
  );

  return [...dersler.entries()].map(([key, ders]) => ({
    key,
    nodeKey: `d:${key}`,
    ders: ders.label,
    week: ders.week,
    total: ders.total,
    dueCount: ders.dueCount,
    heat: heatOf(ders.total, maxDersTotal),
    konular: [...ders.konular.entries()].map(([konuKey, konu]) => ({
      key: konuKey,
      nodeKey: `k:${key}|${konuKey}`,
      konu: konu.label,
      week: konu.week,
      total: konu.total,
      dueCount: konu.dueCount,
      heat: heatOf(konu.total, maxKonuTotal),
      mistakes: konu.mistakes,
    })),
  }));
}

/**
 * Yoğunluğu rampa adımına indirger.
 *
 * ── Neden GÖRECELİ, sabit eşik değil? ──
 * "5 yanlış çoktur" diyen bir eşik, elli yanlışı olan biri için de üç
 * yanlışı olan biri için de yanlış cevap verir. En yoğun dal daima 4
 * olur, gerisi ona göre konumlanır: gösterge kullanıcının kendi
 * dağılımını okur.
 *
 * `Math.ceil` bilinçlidir: var olan bir dal asla 0'a — yani görünmez
 * renge — düşmez. 0 yalnızca gerçekten boş olan için ayrılmıştır.
 */
function heatOf(total: number, max: number): Heat {
  if (total <= 0 || max <= 0) return 0;
  return Math.ceil((total / max) * 4) as Heat;
}

function max(values: readonly number[]): number {
  let out = 0;
  for (const v of values) if (v > out) out = v;
  return out;
}
