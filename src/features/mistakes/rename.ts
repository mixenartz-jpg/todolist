import { normalize } from "@/lib/text/normalize";
import type { Mistake } from "./types";

export interface RenamePlan {
  /** Güncellenecek kayıt kimlikleri. Boşsa hiçbir şey yazılmaz. */
  ids: string[];
  /** Kaç kayıt değişecek — onay kutusunda gösterilir. */
  count: number;
  /**
   * Hedef ad BAŞKA bir dalda zaten var mı?
   *
   * Varsa bu bir birleştirmedir ve onay metni bunu açıkça söylemelidir:
   * iki dal tek dala iner ve ikinci bir yeniden adlandırmayla geri
   * ayrılamaz.
   */
  merge: boolean;
  /** Birleşme durumunda hedef dalda hâlihazırda duran kayıt sayısı. */
  mergeIntoCount: number;
}

const EMPTY_PLAN: RenamePlan = {
  ids: [],
  count: 0,
  merge: false,
  mergeIntoCount: 0,
};

/**
 * Bir dersin tüm kayıtlarını yeniden adlandırma planı.
 *
 * ── Neden bir "plan", doğrudan bir mutation değil? ──
 * Onay kutusunun "kaç kayıt güncellenecek" demesi gerekiyor ve bu sayı
 * mutation'ın etkileyeceği satırlarla BİREBİR aynı olmalı. Sayıyı ayrı
 * hesaplamak iki doğruluk kaynağı üretirdi; plan hem sayıyı hem
 * kimlikleri tek yerde üretir ve mutation yalnızca onu uygular.
 *
 * ── Neden kimlik listesi, `eq('ders', ...)` filtresi değil? ──
 * Eşleşme `normalize()` ile Türkçe büyük/küçük harf duyarsızdır
 * ("mat", "MAT", "Mat" aynı dal) ve PostgREST'te böyle bir filtre
 * yazılamaz — veritabanında normalize karşılığı yok. Liste zaten
 * tamamen çekildiği için kimlikleri istemcide toplamak hem mümkün hem
 * bedava.
 *
 * ── Birleştirme ENGELLENMEZ ──
 * Ağaç zaten normalleştirilmiş anahtara göre gruplandığı için "mat" →
 * "Matematik" yazınca kayıtlar mevcut dala katılır. Engellemek,
 * kullanıcının yazım birliği kurmasını imkânsız kılardı; yapılan şey
 * uyarmaktır, yasaklamak değil.
 */
export function planDersRename(
  mistakes: readonly Mistake[],
  fromDers: string,
  toDers: string,
): RenamePlan {
  const target = toDers.trim();
  if (target.length === 0) return EMPTY_PLAN;

  const fromKey = normalize(fromDers.trim());
  const targetKey = normalize(target);

  return collect(
    mistakes,
    (m) => normalize(m.ders.trim()) === fromKey,
    (m) => normalize(m.ders.trim()) === targetKey,
    (m) => m.ders.trim() === target,
    fromKey !== targetKey,
  );
}

/**
 * Bir konunun yeniden adlandırma planı — YALNIZCA kendi dersi içinde.
 *
 * "Türev" hem Matematik hem Fizik altında olabilir; ders bağlamı
 * olmadan birini adlandırmak diğerini de ezerdi. `tree.ts` aynı sebeple
 * konu düğümlerini `nodeKey`'de ders anahtarıyla birlikte kimlikler.
 */
export function planKonuRename(
  mistakes: readonly Mistake[],
  ders: string,
  fromKonu: string,
  toKonu: string,
): RenamePlan {
  const target = toKonu.trim();
  if (target.length === 0) return EMPTY_PLAN;

  const dersKey = normalize(ders.trim());
  const fromKey = normalize(fromKonu.trim());
  const targetKey = normalize(target);

  const inDers = (m: Mistake) => normalize(m.ders.trim()) === dersKey;

  return collect(
    mistakes,
    (m) => inDers(m) && normalize(m.konu.trim()) === fromKey,
    (m) => inDers(m) && normalize(m.konu.trim()) === targetKey,
    (m) => m.konu.trim() === target,
    fromKey !== targetKey,
  );
}

/**
 * Plan üretiminin ortak gövdesi.
 *
 * `alreadyExact` olan kayıtlar dışarıda bırakılır: adı zaten hedefle
 * birebir aynı olan bir satırı güncellemek boş bir yazmadır ve onay
 * kutusundaki sayıyı şişirerek kullanıcıya yalan söylerdi.
 *
 * `canMerge` yalnızca gerçek bir ad değişikliğinde doğrudur. Yalnızca
 * büyük/küçük harf düzeltmesi ("matematik" → "Matematik") birleştirme
 * DEĞİLDİR: normalleştirilmiş anahtar aynı kaldığı için ortada zaten
 * tek dal vardır, yapılan şey yazımı düzeltmektir.
 */
function collect(
  mistakes: readonly Mistake[],
  matchesSource: (m: Mistake) => boolean,
  matchesTarget: (m: Mistake) => boolean,
  alreadyExact: (m: Mistake) => boolean,
  canMerge: boolean,
): RenamePlan {
  const ids: string[] = [];
  let mergeIntoCount = 0;

  for (const m of mistakes) {
    if (canMerge && matchesTarget(m)) mergeIntoCount += 1;

    if (!matchesSource(m)) continue;
    if (alreadyExact(m)) continue;

    ids.push(m.id);
  }

  return {
    ids,
    count: ids.length,
    merge: canMerge && mergeIntoCount > 0,
    mergeIntoCount,
  };
}
