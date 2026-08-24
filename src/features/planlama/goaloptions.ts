/**
 * Hedef seçicinin seçenek listesi — saf karar.
 *
 * Bileşenden AYRILDI çünkü asıl incelik burada: seçilen değerin
 * listede TEMSİL EDİLMESİ gerekiyor, yoksa `<select>` sessizce ilk
 * seçeneğe düşer ve kullanıcı var olan bir bağı "yok" diye görür.
 * Üç durum var ve ikisi kolayca gözden kaçar:
 *
 *   1. Bağ yok            → düz etkin liste.
 *   2. Bağ ARŞİVLİ hedefe → hedef listeye geri eklenir; adı ve rengi
 *                           biliniyor.
 *   3. Bağ listede HİÇ YOK → "yetim". Görev bağlandıktan sonra başka
 *                           bir aya taşınmış olabilir
 *                           (`useRescheduleTask` yalnızca tarihi
 *                           yazar, `goal_id`'ye dokunmaz) ve o ayın
 *                           hedefleri hiç çekilmemiştir. Adı ve rengi
 *                           BİLİNMİYOR, dolayısıyla listeye sahte bir
 *                           hedef olarak eklenemez; ayrıca temsil
 *                           edilir.
 *
 * Saf fonksiyon olması bu depoda test edilebilmesinin tek yolu —
 * React test kütüphanesi kurulu değil (gerekçe `sections.ts`'te).
 */

import type { PlanGoal } from "./types";

export interface GoalPickerOptions {
  /** `<option>` olarak çizilecek hedefler. */
  options: PlanGoal[];
  /** Seçili hedef — biliniyorsa. Yetim bağda `null`. */
  current: PlanGoal | null;
  /** Bağ var ama hedef listede yok (başka aya ait). */
  orphan: boolean;
}

export function goalPickerOptions(
  goals: readonly PlanGoal[],
  value: string | null,
): GoalPickerOptions {
  const active = goals.filter((g) => g.archivedAt === null);
  const found = value === null ? undefined : goals.find((g) => g.id === value);

  const options =
    found && found.archivedAt !== null ? [...active, found] : active;

  return {
    options,
    current: found ?? null,
    orphan: value !== null && found === undefined,
  };
}
