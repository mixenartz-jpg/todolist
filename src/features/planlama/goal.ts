/**
 * Hedef ve kategori girdilerinin normalize/doğrulama kuralları.
 *
 * Bu mantık BİLEREK bileşenlerin dışında: depoda vitest yalnızca
 * `*.test.ts` çalıştırıyor ve `.tsx` test edilmiyor (bkz.
 * `sections.ts`'in `shouldPersistLabel` yorumundaki aynı gerekçe).
 * Formun içinde kalsaydı hiçbir test bu kurallara ulaşamazdı.
 *
 * Sınırlar veritabanı kısıtlarıyla BİREBİR aynıdır (0008): istemci
 * `maxLength` olarak da uygular ki kullanıcı sunucudan hata almadan
 * önce sınırı görsün.
 */

import type { Category } from "./types";

/*
 * Aylık ve haftalık hedefler AYNI sınırları paylaşır (0008 / 0011):
 * ikisi de aynı formda, aynı genişlikte yazılan bir başlık ve bir
 * ayrıntıdır. Ölçek başına ayrı sabitler tanımlamak, iki ekranda iki
 * farklı kesilme noktası demek olurdu — kullanıcı için görünür bir
 * tutarsızlık.
 */
export const GOAL_TITLE_MAX = 120;
export const GOAL_NOTE_MAX = 2000;
export const CATEGORY_NAME_MAX = 40;
/** DB kısıtı: 1..9999. */
export const GOAL_TARGET_MAX = 9999;

/**
 * Hedef başlığını kaydedilebilir biçime indirger.
 *
 * Boş ya da yalnızca boşluktan oluşan girdi `null` döner — "başlıksız
 * hedef" diye bir şey yok ve boş string'i geçerli sayıp veritabanına
 * göndermek kısıt hatası demekti.
 */
export function normalizeGoalTitle(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, GOAL_TITLE_MAX);
}

/** Kategori adı için aynı kural. */
export function normalizeCategoryName(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, CATEGORY_NAME_MAX);
}

/**
 * Sayısal hedef girdisini çözer — ÜÇ ayrı sonuç.
 *
 *   null       → alan boş bırakıldı; hedef bağlı GÖREVLERLE ölçülür.
 *                Bu geçerli ve yaygın bir seçimdir.
 *   number     → geçerli sayısal hedef.
 *   undefined  → girdi bozuk (harf, 0, negatif, sınır dışı).
 *                KAYDETME, kullanıcıya hata göster.
 *
 * Üç durumu ayırmak şart: "boş bıraktım" ile "yanlış yazdım" farklı
 * sonuçlar doğurur. İkisini `null` ile ifade etseydik, "abc" yazan
 * kullanıcının hedefi sessizce görev-bazlı ölçüme düşerdi ve o hiç
 * uyarılmazdı.
 */
export function parseTargetCount(input: string): number | null | undefined {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  /*
   * `Number()`, `parseInt` DEĞİL: parseInt("12abc") → 12 döner ve
   * yazım hatasını sessizce kabul ederdi. Number("12abc") → NaN.
   */
  const value = Number(trimmed);

  if (!Number.isInteger(value)) return undefined;
  if (value < 1 || value > GOAL_TARGET_MAX) return undefined;

  return value;
}

/**
 * İlerleme sayacını bir adım oynatır ve sınırlarda kırpar.
 *
 * Üst sınır `target`: hedefin üstüne çıkmak "%150 tamamlandı" gibi
 * anlamsız bir ilerleme çubuğu üretirdi. `target` null ise sayaç zaten
 * kullanılmıyor (ilerleme görevlerden okunuyor) ve değer olduğu gibi
 * kalır.
 */
export function stepDoneCount(
  current: number,
  delta: -1 | 1,
  target: number | null,
): number {
  if (target === null) return current;

  const next = current + delta;
  if (next < 0) return 0;
  if (next > target) return target;
  return next;
}

/**
 * Haftalık hedefin sayaç durumundan tamamlanma damgasını okur.
 *
 * `now` dışarıdan geçilir ki fonksiyon saf kalsın ve test edilebilsin.
 *
 * Sayaçsız hedefte (`target === null`) HER ZAMAN null döner: orada
 * tamamlanma yalnızca elle işaretlenir ve bu fonksiyonun kararı değildir.
 */
export function completionStamp(
  doneCount: number,
  target: number | null,
  now: string,
): string | null {
  if (target === null) return null;
  return doneCount >= target ? now : null;
}

/**
 * Sayısal hedef DEĞİŞTİĞİNDE sayacın ve tamamlanmanın ne olacağını
 * hesaplar.
 *
 * ── Hedef DEĞİŞMEDİYSE hiçbir şeye dokunulmaz ──
 * İlk koşul yalnızca bir kısayol değil, DOĞRULUK meselesi: form her
 * kaydetmede mevcut hedefi olduğu gibi geri gönderiyor, yani "başlıktaki
 * yazım hatasını düzelt" de buraya `target` değişmemiş olarak gelir.
 * Erken çıkış olmasaydı tamamlanma o kaydetmede sayaçtan yeniden
 * hesaplanırdı ve 3/5'te elle işaretlenmiş bir hedef, kullanıcı sadece
 * başlığa dokunduğu için sessizce işaretsiz kalırdı — `completedAt`'in
 * sayaçtan bağımsız olması gerektiği kuralının tam ihlali.
 *
 * Hedef GERÇEKTEN değiştiyse sayaç sessizce yalana dönebilir ve iki
 * yönün de ele alınması gerekir:
 *
 *   Hedef KALDIRILDI (null) → sayaç sıfırlanır. Kalsaydı, hedef tekrar
 *     sayısal yapıldığında kullanıcının hiç işaretlemediği eski bir
 *     ilerleme canlanırdı. `completedAt`'e DOKUNULMAZ: sayaçsız hedefte
 *     tamamlanma zaten elle işaretlenir ve onu silmek kullanıcının
 *     kararını geri almak olurdu.
 *
 *   Hedef DÜŞÜRÜLDÜ → sayaç yeni hedefe kırpılır ve tamamlanma yeniden
 *     hesaplanır. Kırpma olmasaydı "7 / 3" gibi bir sayaç çıkardı;
 *     yeniden hesaplama olmasaydı 2/5'ten 2/2'ye inen hedef
 *     tamamlanmamış görünür ve `+` düğmesi de sınırda devre dışı
 *     olduğu için kullanıcı onu sayaçla ASLA tamamlayamazdı.
 */
export function recountOnTargetChange(
  goal: {
    doneCount: number;
    completedAt: string | null;
    /** Kaydetmeden ÖNCEKİ sayısal hedef. */
    targetCount: number | null;
  },
  target: number | null,
  now: string,
): { doneCount: number; completedAt: string | null } {
  if (target === goal.targetCount) {
    return { doneCount: goal.doneCount, completedAt: goal.completedAt };
  }

  if (target === null) {
    return { doneCount: 0, completedAt: goal.completedAt };
  }

  const doneCount = Math.min(goal.doneCount, target);
  return { doneCount, completedAt: completionStamp(doneCount, target, now) };
}

/**
 * Bu kategori adı zaten var mı?
 *
 * Türkçe duyarsız karşılaştırma: "Matematik" ve "matematik" kullanıcı
 * için aynı kategoridir. Veritabanındaki `unique (user_id, name)`
 * kısıtı ise harf DUYARLIDIR ve ikisini ayrı satır olarak kabul eder —
 * bu bilinçli bir ayrım (gerekçe 0008'de: `lower()` üzerinde
 * functional index Türkçe'de `I → ı` beklentisiyle çelişir).
 *
 * Yani asıl deneyim BURADA: kullanıcı sunucuya hiç varmadan uyarılır.
 * DB kısıtı son savunma hattıdır.
 *
 * `excludeId` yeniden adlandırma içindir: bir kategoriyi kendi adıyla
 * kaydetmek "çakışma" sayılmamalı.
 */
export function isDuplicateCategoryName(
  categories: readonly Category[],
  name: string,
  excludeId?: string,
): boolean {
  const trimmed = name.trim();
  if (trimmed.length === 0) return false;

  return categories.some(
    (c) =>
      c.id !== excludeId &&
      c.name.localeCompare(trimmed, "tr", { sensitivity: "base" }) === 0,
  );
}
