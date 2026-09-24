"use client";

import Link from "next/link";
import { slotVar } from "@/lib/ui/colors";
import { formatPercent } from "@/lib/ui/tr";
import type { PlanGoal } from "./types";

interface GoalTreeHeaderProps {
  goal: PlanGoal;
  nodeCount: number;
  taskTotal: number;
  taskDone: number;
  /** null → ağaç kurulu ama hiç görev dağıtılmamış. */
  ratio: number | null;
}

/**
 * Ağaç sayfasının başlığı: hedefin kendisi ve tek bir özet oran.
 *
 * ── Neden `PlanlamaHeader` kullanılmıyor? ──
 * O başlık ay/hafta arasında gezinmek için var (ileri/geri okları,
 * ölçek anahtarı). Burada gezilecek bir zaman yok — sayfa TEK bir
 * hedefe ait ve o hedefin ayı zaten sabit. Ay oklarını göstermek,
 * basıldığında ne olacağı belirsiz bir denetim koymak olurdu.
 *
 * ── Sayısal hedef uyarısı ──
 * Hedefin `targetCount`'u varsa ve ağacı da varsa, kart artık
 * ağaçtan okuyor (goalmeasure.ts). Bu, kullanıcının bir zaman girdiği
 * sayının sessizce yoksayılması demek; sessiz bırakmak "sayacım
 * nereye gitti" sorusunu doğururdu.
 */
export function GoalTreeHeader({
  goal,
  nodeCount,
  taskTotal,
  taskDone,
  ratio,
}: GoalTreeHeaderProps) {
  return (
    <header className="mb-4 flex flex-col gap-3">
      <Link
        href="/planlama/hedefler"
        className="w-fit text-[length:var(--text-xs)] text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-accent)]"
      >
        ← Hedefler
      </Link>

      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className="mt-2 size-3 shrink-0 rounded-full"
          style={{ background: slotVar(goal.colorSlot) }}
        />

        <div className="min-w-0 flex-1">
          <h1 className="text-[length:var(--text-xl)] font-medium">
            {goal.title}
          </h1>

          {goal.note && (
            <p className="mt-1 text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">
              {goal.note}
            </p>
          )}
        </div>
      </div>

      {nodeCount === 0 ? (
        <p className="text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-3)]">
          Bu hedefi parçalara ayır. Önce konuları yaz, sonra her konunun
          altına ne yapacağını — sonra o kalemleri günlere dağıt.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {ratio === null ? (
            <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
              {nodeCount} başlık yazıldı, henüz güne dağıtılmadı.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div
                  className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(ratio * 100)}
                  aria-label={`${goal.title} ilerlemesi`}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out-expo)]"
                    style={{
                      width: `${ratio * 100}%`,
                      background: slotVar(goal.colorSlot),
                    }}
                  />
                </div>

                <span className="tabular shrink-0 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
                  {formatPercent(ratio)}
                </span>
              </div>

              <p className="tabular text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                {nodeCount} başlık · {taskDone} / {taskTotal} iş
              </p>
            </>
          )}

          {goal.targetCount !== null && (
            /* Sayısal hedef ARTIK OKUNMUYOR. Sessiz bırakmak,
               kullanıcının girdiği bir sayının nereye gittiğini
               açıklamamak olurdu. */
            <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
              Bu hedefin sayısal hedefi ({goal.targetCount}) var ama ağaç
              kurulduğu için ilerleme artık buradan okunuyor.
            </p>
          )}
        </div>
      )}
    </header>
  );
}
