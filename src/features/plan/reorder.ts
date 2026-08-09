/**
 * Gün içi görev sıralaması — saf mantık.
 *
 * ── Neden SÜRÜKLE-BIRAK değil? ──
 * `DayPicker`'daki gerekçenin aynısı: sürükleme dokunmada kaydırmayla
 * çakışır, klavyeyle karşılığı yoktur ve ekran okuyucuya hiçbir şey
 * söylemez. Yukarı/aşağı düğmeleri her girdi yönteminde aynı işi yapar
 * ve depoda bir sürükle-bırak kütüphanesi de yok.
 *
 * ── Neden TÜM liste yeniden numaralanıyor? ──
 * Bir günde görev sayısı onlarla ölçülür. Kesirli aralık (a ile b
 * arasına (a+b)/2 koymak) yüzlerce satırlık listelerde yazma sayısını
 * düşürür ama burada kazandırdığı şey yok; karşılığında hassasiyet
 * tükenmesi ve "neden 0.0000001?" diye bakılan bir alan bırakırdı.
 * Düz 0..n-1 numaralama her zaman tutarlı bir sonuç verir.
 *
 * `sort_order` bugüne kadar hep 0'dı (veritabanı varsayılanı) ve hiç
 * yazılmıyordu; ilk taşımada o günün tamamı numaralanır.
 */

import type { Task } from "@/features/tasks/types";

/** Sunucuya yazılacak tek bir sıra değişikliği. */
export interface SortOrderPatch {
  id: string;
  sortOrder: number;
}

/**
 * Görevi listede bir sıra yukarı (-1) ya da aşağı (+1) taşır.
 *
 * `tasks` EKRANDA GÖRÜNDÜĞÜ sırayla verilmelidir — kullanıcı gördüğü
 * satırı oynatıyor, veritabanındaki sırayı değil.
 *
 * Dönen dizi yalnızca DEĞİŞEN satırları içerir: zaten doğru numaraya
 * sahip görevleri yeniden yazmak, her taşımada tüm günü sunucuya
 * göndermek olurdu.
 *
 * Sınırdaki hareket (ilk satır yukarı, son satır aşağı) ve listede
 * olmayan `id` boş dizi döndürür — çağıran taraf "yazacak bir şey yok"
 * diye okur.
 */
export function planReorder(
  tasks: readonly Task[],
  id: string,
  delta: -1 | 1,
): SortOrderPatch[] {
  const from = tasks.findIndex((t) => t.id === id);
  if (from === -1) return [];

  const to = from + delta;
  if (to < 0 || to >= tasks.length) return [];

  // Yerinde takas: yalnızca iki komşu yer değiştirir, aradaki hiçbir
  // görev kaymaz. Kopya üzerinde çalışılır — girdi dizisi değişmez.
  const next = [...tasks];
  [next[from], next[to]] = [next[to], next[from]];

  const patches: SortOrderPatch[] = [];
  for (let i = 0; i < next.length; i++) {
    if (next[i].sortOrder !== i) patches.push({ id: next[i].id, sortOrder: i });
  }

  return patches;
}

/**
 * Sıra değişikliğini görev listesine uygular — iyimser güncelleme için.
 *
 * Alanları yamalamak YETMEZ, liste yeniden de sıralanır.
 * `splitDaySchedule` saatsiz görevlerin "mevcut sırasını korur", yani
 * onların sırası doğrudan bu dizinin sırasıdır. Yalnızca `sortOrder`
 * yazılsaydı yeni değerler önbellekte durur ama ekranda hiçbir şey
 * kıpırdamaz, kullanıcı düğmeye bastığında satır yerinde kalır ve
 * sunucu cevabı gelince aniden zıplardı.
 *
 * Sıralama `useTasks`'in sunucu sıralamasını taklit eder: önce
 * tamamlanmamışlar, sonra tarihe göre, sonra `sortOrder`. Aksi halde
 * iyimser sıra ile sunucudan dönen sıra farklı olur ve liste iki kez
 * yerleşirdi.
 */
export function applySortOrders(
  tasks: readonly Task[],
  patches: readonly SortOrderPatch[],
): Task[] {
  if (patches.length === 0) return [...tasks];

  const byId = new Map(patches.map((p) => [p.id, p.sortOrder]));

  const patched = tasks.map((task) => {
    const sortOrder = byId.get(task.id);
    return sortOrder === undefined ? task : { ...task, sortOrder };
  });

  return patched.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;

    // Tarihsizler sona: sunucu `nullsFirst: false` ile sıralıyor.
    if (a.dueDate !== b.dueDate) {
      if (a.dueDate === null) return 1;
      if (b.dueDate === null) return -1;
      return a.dueDate < b.dueDate ? -1 : 1;
    }

    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}
