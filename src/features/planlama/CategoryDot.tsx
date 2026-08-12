import { slotVar } from "@/lib/ui/colors";
import type { Category } from "./types";

/**
 * Kategorinin renk noktası.
 *
 * `aria-hidden`: renk TEK BAŞINA bilgi taşımamalı. Kategori adı,
 * noktayı gösteren her yerde ya yazıyla ya da satırın `aria-label`'ı
 * içinde geçer — nokta yalnızca hızlı tarama için görsel bir işarettir
 * (`PlanBacklog`'un kendi yorumundaki aynı kural).
 *
 * Sunucu bileşeni: durum ya da olay taşımıyor.
 */
export function CategoryDot({
  category,
  size = 8,
}: {
  category: Category;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: slotVar(category.colorSlot),
      }}
    />
  );
}
