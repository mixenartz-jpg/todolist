"use client";

import { TaskColorRow } from "./TaskColorRow";
import { TaskGoalRow } from "./TaskGoalRow";
import type { Task } from "./types";

/**
 * Görev satırının açılır bölmesi: hedef ve renk.
 *
 * ── `TaskPopover`'ın yerini aldı ──
 * Eski panel ızgaradaki bloğun yanına çapalanıyordu: dört kenarı
 * deneyen bir konumlandırma modülü (`anchor.ts`), portal, `fixed`
 * konum, masaüstü/mobil için iki ayrı kabuk ve dışarı tıklamayı
 * yakalayan bir dinleyici. Bloklar saat ızgarasıyla birlikte gidince
 * çapalanacak bir şey de kalmadı — bölme satırın ALTINA indi ve o
 * makinenin tamamı düştü.
 *
 * Kaybolmayan üç şey: hedef bağı, renk ve açıklama. Üçü de görevin
 * KENDİ alanları ve tek görünür düzenleme yolları burasıydı; panelle
 * birlikte silinselerdi şemada var olup arayüzde erişilemeyen üç alan
 * kalırdı (`goal_id` bunu bir kez zaten yaşadı — bkz. TaskGoalRow).
 *
 * ── Açıklama artık burada DEĞİL ──
 * Açıklama satırın kendisine taşındı (`TaskNote`): bu bölmenin
 * arkasında kullanıcı onu bulamıyordu. Bölme açıkken notsuz satırda
 * "Açıklama ekle" düğmesi belirir — eski yol kapanmadı, yalnızca
 * görünür oldu.
 */
export function TaskDetails({
  task,
  /** Devralınacak kategori rengi — renk satırının önizlemesi için. */
  inheritedColor,
  onSetGoal,
  onSetColor,
}: {
  task: Task;
  inheritedColor: number | null;
  onSetGoal: (goalId: string | null) => void;
  onSetColor: (colorSlot: number | null) => void;
}) {
  return (
    /* Bölme satırın İÇİNDE ama kendi zeminiyle ayrılıyor: aynı zeminde
       olsaydı satırın kendi kontrolleriyle bölmenin kontrolleri tek bir
       küme gibi okunurdu. */
    <div className="flex flex-col gap-3 rounded-lg bg-[var(--color-surface-2)] p-3">
      <TaskGoalRow task={task} onChange={onSetGoal} />

      <TaskColorRow
        value={task.colorSlot}
        inherited={inheritedColor}
        onChange={onSetColor}
      />
    </div>
  );
}
