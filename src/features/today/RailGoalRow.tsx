"use client";

import { cn } from "@/lib/ui/cn";
import { slotVar } from "@/lib/ui/colors";
import type { WeekGoal } from "@/features/planlama/types";

/**
 * Rayın hedef satırı — haftalık ve aylık hedefin ORTAK gövdesi.
 *
 * ── Neden `WeekGoalCard`/`GoalCard` kullanılmıyor? ──
 * O kartlar kendi içlerinde inline düzenleme formu taşıyor ve
 * açıldıklarında rayın genişliğini aşan bir form çiziyorlar. Ray bir
 * ÖZET sütunu: hedefi burada okur, sayacı bir adım oynatır, düzenlemek
 * için Planlama'ya gider. Kartları dar sütuna sıkıştırmak, iki ekranın
 * da bozulması demekti.
 *
 * ── Neden tek bileşen? ──
 * Haftalık ve aylık hedefin RAYDAKİ görünümü aynı: renk noktası,
 * başlık, sayaç, artı düğmesi. Ayrışma yalnızca "tamamlandı" ölçütünde
 * (`completedAt` vs `ratio >= 1`) ve o karar çağıran tarafta veriliyor.
 * İki neredeyse-aynı bileşen, birinde yapılan düzeltmenin ötekine
 * geçmemesi demekti.
 */
export function RailGoalRow({
  title,
  colorSlot,
  doneCount,
  targetCount,
  done,
  onStep,
  slices,
}: {
  title: string;
  colorSlot: number;
  doneCount: number;
  /** null → sayaçsız hedef; sayaç ve artı düğmesi çizilmez. */
  targetCount: number | null;
  done: boolean;
  /**
   * Sayacı bir artırır. Sayaçsız hedeflerde ya da hedefe ulaşılmışken
   * verilmez — düğme o durumda hiç render edilmez.
   */
  onStep?: () => void;
  /**
   * Bu AYLIK hedefe bağlı, BU HAFTAYA ait dilimler (0014).
   *
   * Zincirin görünür olduğu tek yer: "bu ay kitabı bitir" hedefinin
   * altında "bu hafta 3 bölüm" yazar. Yalnızca aylık hedef satırında
   * dolu gelir; haftalık hedefin kendi dilimi olmaz.
   */
  slices?: readonly WeekGoal[];
}) {
  const hasCount = targetCount !== null;
  const atTarget = hasCount && doneCount >= targetCount;

  return (
    <li className="flex flex-col py-1">
      <div className="flex items-center gap-2">
        {/* Kimlik rengi — hedefi Planlama ekranındaki kartıyla eşler. */}
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ background: slotVar(colorSlot) }}
        />

        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[length:var(--text-sm)]",
            done
              ? "text-[var(--color-ink-3)] line-through"
              : "text-[var(--color-ink-2)]",
          )}
          title={title}
        >
          {title}
        </span>

        {hasCount && (
          <span
            className={cn(
              "tabular shrink-0 text-[length:var(--text-xs)]",
              atTarget
                ? "text-[var(--color-good)]"
                : "text-[var(--color-ink-3)]",
            )}
          >
            {doneCount}/{targetCount}
          </span>
        )}

        {/*
         * Artı düğmesi hedefe ULAŞILINCA kaybolur. Sayacı hedefin
         * üstüne çıkarmak mümkün ama rayda anlamı yok: burada yapılan
         * iş "bugün bir tane daha yaptım" demek, hedefi yeniden
         * tanımlamak değil. Fazlasını girmek isteyen Planlama'ya gider.
         */}
        {hasCount && !atTarget && onStep && (
          <button
            type="button"
            onClick={onStep}
            aria-label={`${title}: bir artır`}
            className={cn(
              "grid size-5 shrink-0 place-items-center rounded-md border border-[var(--color-line-2)]",
              "text-[var(--color-ink-3)]",
              "transition-colors duration-[var(--duration-fast)]",
              "hover:border-[var(--color-accent)] hover:text-[var(--color-ink)]",
            )}
          >
            <svg
              viewBox="0 0 12 12"
              className="size-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M6 2.5v7M2.5 6h7" />
            </svg>
          </button>
        )}
      </div>

      {/* Haftalık dilimler — aylık hedefin ALTINDA, girintili.
          Ayrı bir satır değil aynı öğenin devamı: "bu ay şunu bitir,
          bunun bu haftaki payı şu" tek bir cümledir. */}
      {slices && slices.length > 0 && (
        <ul className="mt-0.5 ml-4 flex flex-col border-l border-[var(--color-line)] pl-2">
          {slices.map((slice) => (
            <li
              key={slice.id}
              className="flex items-center gap-1.5 text-[length:var(--text-xs)]"
            >
              <span
                className={cn(
                  "min-w-0 flex-1 truncate",
                  slice.completedAt !== null
                    ? "text-[var(--color-ink-4)] line-through"
                    : "text-[var(--color-ink-3)]",
                )}
                title={slice.title}
              >
                {slice.title}
              </span>

              {slice.targetCount !== null && (
                <span className="tabular shrink-0 text-[var(--color-ink-4)]">
                  {slice.doneCount}/{slice.targetCount}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** Rayın boş hedef listesi metni — üç yerde aynı ton. */
export function RailEmpty({ children }: { children: string }) {
  return (
    <p className="text-[length:var(--text-xs)] leading-relaxed text-[var(--color-ink-3)]">
      {children}
    </p>
  );
}
