import type { Task } from "./types";

/**
 * Görevin çizilecek renk slotu.
 *
 * Öncelik: KENDİ rengi > kategorisinin rengi > yok (nötr).
 *
 * ── Neden ayrı bir modül? ──
 * Bu kural en az iki ekranda türetiliyor (Bugün ızgarası, Planlama
 * ızgarası) ve her ikisi de `colorOf` adında bir geri çağrı geçiyor.
 * Kural iki yerde yazılsaydı biri kategori rengini kazandırır, öteki
 * görev rengini kazandırırdı ve fark yalnızca göze çarpardı — teste
 * takılmazdı, çünkü ikisi de "bir renk" döndürüyor.
 *
 * ── `??` ZORUNLU, `||` DEĞİL ──
 * Slot 0 MAVİDİR ve JavaScript'te falsy'dir. `task.colorSlot || ...`
 * yazan bir uygulama, kullanıcı mavi seçtiğinde sessizce kategori
 * rengine düşer. Bu, gözle fark edilmesi zor bir hatadır: renk
 * "çalışıyor" görünür, sadece bir tanesi çalışmaz. color.test.ts bunu
 * açıkça ölçer.
 */
export function taskColorSlot(
  task: Pick<Task, "colorSlot" | "categoryId">,
  categoryColorOf: (categoryId: string) => number | null | undefined,
): number | null {
  if (task.colorSlot !== null) return task.colorSlot;
  if (task.categoryId === null) return null;

  /*
   * Kategori haritada BULUNAMAYABİLİR: silinen kategorinin
   * `on delete set null`'ı sunucuda işlenmişken önbellekteki görev
   * hâlâ eski kimliği taşıyor olabilir (bkz. useDeleteCategory'nin
   * `qk.tasks()` tazelemesi — o tazeleme gelene kadarki aralık).
   * `undefined` gelirse nötre düşeriz, patlamayız.
   */
  return categoryColorOf(task.categoryId) ?? null;
}
