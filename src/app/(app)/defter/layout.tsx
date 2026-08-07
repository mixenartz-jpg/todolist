import type { ReactNode } from "react";
import { DefterTabs } from "./DefterTabs";

/**
 * Defter kabuğu: alt sekmeler + seçili bölüm.
 *
 * Sekme çubuğu ekranların KENDİ başlıklarının üstünde durur; her ekran
 * kendi başlığını ve eylem düğmesini korur.
 */
export default function DefterLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-[var(--color-line)] px-4 pt-3 md:px-6">
        <div className="mx-auto w-full max-w-2xl">
          <DefterTabs />
        </div>
      </div>

      {children}
    </div>
  );
}
