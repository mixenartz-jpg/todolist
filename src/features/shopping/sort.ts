/**
 * Alınacaklar listesinin sıra ve giriş kuralları.
 *
 * Bileşenden AYRILDI çünkü bu depoda yalnızca `.test.ts` çalıştırılıyor
 * (React test kütüphanesi kurulu değil, bkz. vitest.config.mts). Bu
 * mantık `ShoppingCard.tsx` içinde kalsaydı hiçbir test ona ulaşamazdı
 * — `sections.ts` ve `anchor.ts`'in aynı gerekçesi.
 */

import { SHOPPING_TITLE_MAX, type ShoppingItem } from "./types";

/**
 * Yeni kalemin `sortOrder` değeri: listedeki en büyüğün bir fazlası.
 *
 * ── Neden `list.length` değil? ──
 * Silme deliği açar. [0,1,2] listesinden ortadaki silinince uzunluk 2
 * olur ve yeni kalem `sortOrder: 2` alır — zaten var olan bir değer.
 * O eşitlikte sıra `created_at`'e düşer, yani yeni kalem eski bir
 * kalemin ÜSTÜNDE belirebilir. Maksimumun bir fazlası bu durumu
 * imkânsız kılar.
 *
 * ── Neyi kapatmaz? ──
 * Verilen listenin GÜNCEL olduğunu varsayar; bu fonksiyon tek başına
 * eşzamanlı eklemeyi çözemez. Ekleme optimistic olmadığı için, uçuşta
 * bir insert varken çağrılırsa aynı değeri iki kez üretir. O kapı
 * çağıran tarafta: `ShoppingCard`'ın `handleSubmit`'i uçuşta ekleme
 * varken hiç çağırmıyor.
 *
 * ── Neden yeniden numaralama yok? ──
 * `reorder.ts`'in düz 0..n-1 numaralaması taşıma işlemi içindir:
 * kullanıcı sırayı DEĞİŞTİRDİĞİNDE tüm liste yazılır. Burada taşıma
 * yok, yalnızca ekleme var; her eklemede tüm listeyi yeniden yazmak
 * bir satırlık iş için n satırlık yazma olurdu.
 *
 * Boş listede 0 döner — sütunun veritabanı varsayılanıyla aynı.
 */
export function nextSortOrder(items: readonly ShoppingItem[]): number {
  let max = -1;
  for (const item of items) {
    if (item.sortOrder > max) max = item.sortOrder;
  }
  return max + 1;
}

/**
 * Girilen başlığı kaydedilebilir biçime indirger; `null` → kaydetme.
 *
 * `normalizeLabelInput` ile aynı disiplin: sınırı aşan girdi KIRPILMAZ,
 * `null` döner. Kırpmak, kullanıcının yazdığından farklı bir şeyi
 * sessizce kaydetmek olurdu. Input zaten `maxLength` ile bu duruma
 * girmeyi engelliyor; buradaki kontrol, sunucuya check kısıtı
 * tarafından reddedilecek bir satır göndermemek için son savunmadır.
 */
export function normalizeTitleInput(input: string): string | null {
  const trimmed = input.trim();

  if (trimmed.length === 0) return null;
  if (trimmed.length > SHOPPING_TITLE_MAX) return null;

  return trimmed;
}

/**
 * Listenin özeti — başlıktaki sayaç için.
 *
 * Gösterilen sayı ALINMAMIŞ kalemlerdir, toplam değil: kullanıcının
 * sorduğu soru "kaç şey kaldı", "bu listede kaç satır var" değil.
 * `TodayScreen`'in "Bir ara" başlığındaki sayaç da aynı kararı veriyor
 * (`someday.filter((t) => !t.done).length`).
 */
export function pendingCount(items: readonly ShoppingItem[]): number {
  return items.filter((item) => item.completedAt === null).length;
}
