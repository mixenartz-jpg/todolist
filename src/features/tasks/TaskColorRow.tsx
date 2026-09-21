"use client";

import { cn } from "@/lib/ui/cn";
import { SLOT_HEX, SLOT_NAMES } from "@/lib/ui/colors";

interface TaskColorRowProps {
  /** Görevin KENDİ rengi; null → kategoriden devralıyor. */
  value: number | null;
  /** Devralınacak kategori rengi — "kategori rengi" seçeneğinin önizlemesi. */
  inherited: number | null;
  onChange: (slot: number | null) => void;
}

/**
 * Görevin kendi rengini seçtiren satır.
 *
 * ── Neden `ColorSlotPicker` DEĞİL? ──
 * O bileşenin sözleşmesi `value: number` — null yok, çünkü kategori,
 * hedef ve rutin RENGİ OLMAK ZORUNDA olan şeylerdir. Görevde renk
 * ZORUNLU DEĞİL: null "kategorinden devral" demek ve bu, seçilebilir
 * dokuzuncu bir durum. `ColorSlotPicker`'ın imzasını null kabul edecek
 * şekilde genişletmek, onun üç mevcut çağıranını (CategoryManager,
 * GoalForm, WeekGoalForm) hiç ihtiyaç duymadıkları bir belirsizliğe
 * ortak ederdi.
 *
 * Kendi yorumu da bunu öngörüyor: "üçüncü bir kullanan çıkarsa
 * birleştirme gerekçesi doğar". Burada çıkan üçüncü bir KULLANAN değil,
 * FARKLI SÖZLEŞMELİ bir kardeş.
 *
 * Palet ve etkileşim dili birebir aynı tutuldu — kullanıcı için "renk
 * seçmek" tek bir harekettir ve iki ekranda farklı görünmemeli.
 */
export function TaskColorRow({ value, inherited, onChange }: TaskColorRowProps) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1 text-[length:var(--text-xs)] text-[var(--color-ink-2)]">
        Renk
      </legend>

      <div className="flex flex-wrap items-center gap-1.5">
        {/*
          "Kategori rengi" seçeneği ÖNCE geliyor: varsayılan durum
          budur ve listenin sonuna atılmış bir "temizle" düğmesi,
          kullanıcıya varsayılana dönmenin bir istisna olduğunu
          söylerdi. Oysa görevlerin çoğu burada kalacak.
        */}
        <button
          type="button"
          aria-label={
            inherited === null
              ? "Kategori rengi (renk yok)"
              : `Kategori rengi (${SLOT_NAMES[inherited]})`
          }
          aria-pressed={value === null}
          onClick={() => onChange(null)}
          className={cn(
            "flex size-6 items-center justify-center rounded-full border border-dashed transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out-quart)]",
            value === null
              ? "border-[var(--color-ink)] ring-2 ring-[var(--color-ink)] ring-offset-2 ring-offset-[var(--color-bg)]"
              : "border-[var(--color-line-3)] hover:scale-110",
          )}
          style={
            // Devralınan renk varsa nokta olarak GÖSTERİLİR: seçeneğin
            // ne yapacağı okunarak değil bakılarak anlaşılsın.
            inherited === null
              ? undefined
              : { background: SLOT_HEX[inherited], borderStyle: "solid" }
          }
        >
          {inherited === null && (
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-[var(--color-ink-4)]"
            />
          )}
        </button>

        <span aria-hidden className="mx-0.5 h-4 w-px bg-[var(--color-line-2)]" />

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
