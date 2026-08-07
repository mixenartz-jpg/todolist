"use client";

import { useState } from "react";
import { cn } from "@/lib/ui/cn";
import type { DersTally } from "./tally";

export interface Selection {
  ders: string;
  konu: string;
}

interface TallyTableProps {
  tally: readonly DersTally[];
  selection: Selection | null;
  onSelect: (selection: Selection | null) => void;
}

/**
 * Ders → konu yanlış çetelesi.
 *
 * Gerçek bir `<table>`'dır, div yığını değil: iki sayısal sütunu olan
 * tablo verisidir ve ekran okuyucu satır/sütun başlıklarını bedavaya
 * duyurur.
 *
 * Dersler varsayılan olarak AÇIKTIR: tablonun amacı hangi konuda
 * takılındığını göstermek ve her seferinde açmayı beklemek o cevabı
 * bir tık geriye iter.
 */
export function TallyTable({ tally, selection, onSelect }: TallyTableProps) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  function toggle(ders: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(ders)) next.delete(ders);
      else next.add(ders);
      return next;
    });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
      <table className="w-full border-collapse text-[length:var(--text-sm)]">
        <caption className="sr-only">
          Ders ve konuya göre yanlış sayıları
        </caption>

        <thead>
          <tr className="border-b border-[var(--color-line)] text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            <th scope="col" className="px-3.5 py-2 text-left font-medium">
              Ders / Konu
            </th>
            <th scope="col" className="w-20 px-2 py-2 text-right font-medium">
              Bu hafta
            </th>
            <th scope="col" className="w-16 px-3.5 py-2 text-right font-medium">
              Toplam
            </th>
          </tr>
        </thead>

        {tally.map((ders) => {
          const open = !collapsed.has(ders.ders);

          return (
            <tbody key={ders.ders} className="border-b border-[var(--color-line)] last:border-b-0">
              <tr>
                <th scope="rowgroup" className="px-1.5 py-0 text-left font-medium">
                  <button
                    type="button"
                    onClick={() => toggle(ders.ders)}
                    aria-expanded={open}
                    className={cn(
                      "flex w-full items-center gap-1.5 rounded-md px-2 py-2 text-left",
                      "transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-surface-2)]",
                    )}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 12 12"
                      fill="none"
                      aria-hidden
                      className={cn(
                        "shrink-0 text-[var(--color-ink-3)] transition-transform duration-[var(--duration-fast)]",
                        open && "rotate-90",
                      )}
                    >
                      <path
                        d="M4.5 2.5L8 6l-3.5 3.5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {ders.ders}
                  </button>
                </th>
                <td className="tabular px-2 py-2 text-right text-[var(--color-ink-2)]">
                  {ders.week > 0 ? ders.week : "—"}
                </td>
                <td className="tabular px-3.5 py-2 text-right font-medium">
                  {ders.total}
                </td>
              </tr>

              {open &&
                ders.konular.map((konu) => {
                  const active =
                    selection?.ders === ders.ders && selection?.konu === konu.konu;

                  return (
                    <tr key={konu.konu}>
                      <td className="px-1.5 py-0">
                        <button
                          type="button"
                          aria-pressed={active}
                          onClick={() =>
                            onSelect(
                              active ? null : { ders: ders.ders, konu: konu.konu },
                            )
                          }
                          className={cn(
                            "w-full rounded-md py-1.5 pl-7 pr-2 text-left",
                            "transition-colors duration-[var(--duration-fast)]",
                            active
                              ? "bg-[color-mix(in_oklch,var(--color-accent)_15%,transparent)] font-medium text-[var(--color-ink)]"
                              : "text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]",
                          )}
                        >
                          {konu.konu}
                        </button>
                      </td>
                      <td className="tabular px-2 py-1.5 text-right text-[var(--color-ink-3)]">
                        {konu.week > 0 ? konu.week : "—"}
                      </td>
                      <td className="tabular px-3.5 py-1.5 text-right text-[var(--color-ink-2)]">
                        {konu.total}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
