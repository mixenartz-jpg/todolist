import type { PlanScale } from "./range";
import "./planlama.css";

/** Izgaranın yüklenme iskeleti — ölçeğe göre hücre sayısı değişir. */
export function PlanSkeleton({ scale }: { scale: PlanScale }) {
  const count = scale === "week" ? 7 : 35;

  return (
    <div
      className={scale === "week" ? "planWeekGrid" : "planMonthGrid"}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={
            scale === "week"
              ? "h-32 animate-pulse rounded-xl bg-[var(--color-surface-2)]"
              : "aspect-square animate-pulse rounded-lg bg-[var(--color-surface-2)]"
          }
          style={{ animationDelay: `${i * 30}ms` }}
        />
      ))}
    </div>
  );
}
