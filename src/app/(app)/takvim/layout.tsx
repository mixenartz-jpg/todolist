import type { ReactNode } from "react";
import { TakvimTabs } from "./TakvimTabs";

/**
 * Takvim kabuğu: alt sekmeler + seçili görünüm.
 *
 * Sekme çubuğu görünümlerin KENDİ başlıklarının üstünde durur; her
 * görünüm kendi ay/hafta başlığını ve gezinme düğmelerini korur
 * (Defter kabuğuyla aynı düzen).
 */
export default function TakvimLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-[var(--color-line)] px-4 pt-3 md:px-6">
        <div className="mx-auto w-full max-w-2xl">
          <TakvimTabs />
        </div>
      </div>

      {children}
    </div>
  );
}
