"use client";

import { cn } from "@/lib/ui/cn";
import { SLOT_HEX, SLOT_NAMES } from "@/lib/ui/colors";

interface ColorSlotPickerProps {
  value: number;
  onChange: (slot: number) => void;
  /** Erişilebilir grup adı — "Kategori rengi" / "Hedef rengi". */
  legend: string;
}

/**
 * Sekiz slotluk renk seçici.
 *
 * `RoutineForm`'un renk satırıyla AYNI bileşen deseni ve aynı palet:
 * kullanıcı için "renk = kimlik" dili tek kalsın diye. Serbest hex
 * seçici DEĞİL — gerekçe 0008'de ve `colors.ts`'in başında: palet
 * koyu zeminde kontrast ve renk körlüğü ayrımı için doğrulanmış, açık
 * uçlu bir seçici o garantiyi çöpe atardı.
 *
 * `RoutineForm`'daki satır buraya çıkarılıp orada yeniden
 * KULLANILMADI: o form kendi `fieldset`/`legend` düzenine gömülü ve
 * onu değiştirmek bu işin kapsamı dışında. İleride üçüncü bir kullanan
 * çıkarsa birleştirme gerekçesi doğar.
 */
export function ColorSlotPicker({
  value,
  onChange,
  legend,
}: ColorSlotPickerProps) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1 text-[length:var(--text-xs)] text-[var(--color-ink-2)]">
        {legend}
      </legend>

      <div className="flex flex-wrap gap-1.5">
        {SLOT_HEX.map((hex, slot) => (
          <button
            key={slot}
            type="button"
            // Ad ZORUNLU: renk tek başına bilgi taşımamalı ve ekran
            // okuyucu "düğme, düğme, düğme" dememeli.
            aria-label={SLOT_NAMES[slot]}
            aria-pressed={value === slot}
            onClick={() => onChange(slot)}
            className={cn(
              "size-6 rounded-full transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out-quart)]",
              value === slot
                ? "ring-2 ring-[var(--color-ink)] ring-offset-2 ring-offset-[var(--color-bg)]"
                : "hover:scale-110",
            )}
            style={{ background: hex }}
          />
        ))}
      </div>
    </fieldset>
  );
}
