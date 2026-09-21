/**
 * Bir günün görev sırası — saf mantık.
 *
 * ── `splitDaySchedule`'ın yerini aldı ──
 * Eski fonksiyon görevleri saatli/saatsiz diye ikiye ayırıyor, saatli
 * olanları saate göre sıralıyordu. Saat sütunları (`start_time`,
 * `duration_minutes`) kaldırıldığında her görev "saatsiz" tarafa
 * düşecekti ve fonksiyon girdi sırasını aynen döndüren bir kimlik
 * işlevine dönüşecekti — yani yalan söyleyen bir isim.
 *
 * ── Sıralama kuralı `applySortOrders` ile AYNI OLMAK ZORUNDA ──
 * Bu dosyanın var olma sebebi bu. `planReorder` bir sıra düğmesine
 * basıldığında iyimser olarak `applySortOrders` ile yeni sırayı
 * hesaplıyor (reorder.ts); ekranın çizdiği sırayı ise burası veriyor.
 * İkisi ayrışırsa kullanıcı yukarı oka basar, satır bir kare doğru
 * yere gider, sunucu cevabı gelince BAŞKA bir yere zıplar. Derleme
 * hatası yok, çalışma zamanı hatası yok — sadece garip bir arayüz.
 *
 * `dayorder.test.ts` bu eşitliği bir invariant olarak sabitler.
 *
 * Saf fonksiyon olması, bileşene gömülü olsaydı bu depoda hiçbir testin
 * ona ulaşamayacak olmasındandır — yalnızca `.test.ts` çalışıyor,
 * React test kütüphanesi kurulu değil.
 */

import type { Task } from "./types";

/**
 * Bir günün görevlerini ekrandaki sırasına dizer.
 *
 * `sortOrder`, eşitlikte `id`. `done` BURADA sıralamaz: gün içi liste
 * tamamlananları yerinde bırakır (üstü çizilir ama zıplamaz) — bir
 * görevi işaretlemek onu listenin dibine atarsa kullanıcı hangisini
 * işaretlediğini kaybeder.
 */
export function orderForDay(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}
