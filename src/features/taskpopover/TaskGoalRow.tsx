"use client";

import { startOfMonth, todayStr } from "@/lib/date/date";
import { GoalPicker } from "@/features/planlama/GoalPicker";
import { usePlanGoals } from "@/features/planlama/queries";
import type { Task } from "@/features/tasks/types";

/**
 * Görevin bağlı olduğu aylık hedef.
 *
 * ── Neden bu satır var? ──
 * `tasks.goal_id` bağı şemada 0008'den beri VAR ve `goalProgress()`
 * onu okuyor, ama bugüne kadar yalnızca Planlama → Ay → gün panelinden
 * atanabiliyordu. Görevlerin çoğu Bugün ızgarasında doğduğu için aylık
 * hedefler pratikte boş kalıyordu: kullanıcı bütün ay çalışıyor,
 * hedefin ilerlemesi sıfır görünüyordu.
 *
 * ── Hedefler hangi aydan okunuyor? ──
 * GÖREVİN kendi ayından, görüntülenen aydan değil. Bir hedef aya
 * aittir ve o ayın özetinde ölçülür (`GoalPicker` doc-block'u); Bugün
 * ekranında ayın son günü açık dururken bir sonraki güne taşınmış
 * göreve bu ayın hedefini bağlamak, o hedefi ölçmeyen bir aya bağ
 * kurmak olurdu.
 *
 * Tarihsiz görevde ("bir ara") ay yoktur; içinde bulunulan ay
 * kullanılır — kullanıcı tarih vermeden de bir hedefe bağlamak
 * isteyebilir ve en yakın makul ay budur.
 */
export function TaskGoalRow({
  task,
  onChange,
}: {
  task: Task;
  onChange: (goalId: string | null) => void;
}) {
  const month = startOfMonth(task.dueDate ?? todayStr());
  const goalsQuery = usePlanGoals(month);

  const goals = goalsQuery.data ?? [];

  /*
   * O ayda hiç hedef yoksa satır çizilmez: boş bir "Hedefsiz" açılır
   * kutusu, kullanıcıya yapabileceği bir şey sunmayan bir kontrol
   * olurdu.
   *
   * AMA görev zaten bir hedefe bağlıysa çizilir — o bağ başka bir aya
   * ait olabilir ve `GoalPicker` onu "Başka ayın hedefi" seçeneğiyle
   * gösterir. Burada erken dönmek, var olan bir bağı hem görünmez hem
   * kaldırılamaz yapardı.
   */
  if (goals.length === 0 && task.goalId === null) return null;

  return (
    <div className="flex items-center gap-1.5">
      <span className="shrink-0 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
        Hedef
      </span>

      <GoalPicker
        goals={goals}
        value={task.goalId}
        taskTitle={task.title}
        onChange={onChange}
      />
    </div>
  );
}
