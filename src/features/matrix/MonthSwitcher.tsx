"use client";

import Link from "next/link";
import { IstatistikTabs } from "@/app/(app)/istatistik/IstatistikTabs";
import { ScreenHeader } from "@/components/Screen";
import { Button } from "@/components/Button";
import { formatMonthYear } from "@/lib/ui/tr";

interface MonthSwitcherProps {
  year: number;
  month: number;
  onChange: (value: { year: number; month: number }) => void;
  onToday: () => void;
  isCurrentMonth: boolean;
}

export function MonthSwitcher({
  year,
  month,
  onChange,
  onToday,
  isCurrentMonth,
}: MonthSwitcherProps) {
  return (
    <ScreenHeader
      title={formatMonthYear(year, month)}
      actions={
        <>
          {/*
            Rutin yönetimine TEK kalıcı giriş.

            `/rutinler` üst çubuktan çıktı: rutin CRUD'u nadir yapılan
            bir iş ve altı sekme, 320px'te etiketleri kırpma sınırına
            dayıyordu. Ama rotayı sekmeden almak, ona yalnızca boş
            durum bağlantılarından ulaşılabilmesi demekti — yani
            rutini OLAN kullanıcı için hiçbir yerden. Tablo doğru ev:
            ekranın kendisi zaten rutinlerin listesi.
          */}
          <Link
            href="/rutinler"
            className="rounded-md px-2 py-1 text-[length:var(--text-sm)] text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-accent)]"
          >
            Rutinleri yönet
          </Link>

          {!isCurrentMonth && (
            <Button size="sm" variant="ghost" onClick={onToday}>
              Bugün
            </Button>
          )}
          <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          aria-label="Önceki ay"
          onClick={() => onChange(shift(year, month, -1))}
          className="px-2"
        >
          <Chevron direction="left" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Sonraki ay"
          onClick={() => onChange(shift(year, month, 1))}
          className="px-2"
        >
          <Chevron direction="right" />
        </Button>
          </div>
        </>
      }
    >
      {/*
        Tablo artık ANA SEKME DEĞİL, İstatistik'in alt sekmesi
        (gerekçe `AppShell.tsx`'te: yeri Arşiv'e verildi). Sekme
        çubuğu burada da çizilmeli — yoksa kullanıcı Tablo'ya
        geldiğinde hangi yüzeyde olduğunu ve nasıl geri döneceğini
        gösteren hiçbir işaret kalmazdı.
      */}
      <IstatistikTabs />
    </ScreenHeader>
  );
}

function shift(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d={direction === "left" ? "M10 3.5L5.5 8l4.5 4.5" : "M6 3.5L10.5 8 6 12.5"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
