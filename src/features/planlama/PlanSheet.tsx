"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import "./planlama.css";

/*
 * Ajanda kağıdı — plan ekranının taşıyıcı yüzeyi.
 *
 * ── Neden gün başına ayrı kart DEĞİL? ──
 * Önceki sürüm 42 ayrı kutu çiziyordu ve her biri kendi kenarlığını,
 * kendi zeminini, kendi iç kaydırıcısını taşıyordu. Sonuç bir plan
 * yüzeyi değil, kutu kalabalığıydı — kullanıcının "boğuk" dediği şeyin
 * en yoğun hâli.
 *
 * Kağıt tek bir yüzeydir. Günler arası ayrımı BOŞLUK değil KIL ÇİZGİ
 * yapar; böylece gözün takip ettiği tek bir dikey akış kalır ve
 * tarihler tek hatta hizalanır. `impeccable`: iç içe kart daima
 * yanlıştır — burada iç içe kart yok, tek kartın içinde satırlar var.
 *
 * ── Neden `Card` bileşeni kullanılmıyor? ──
 * Kullanılıyor: `PlanSheet` BİR `Card`'dır (`pad="none"`). Ayrı bir
 * bileşen olmasının sebebi hafta bölümlerini ve gün adı başlığını
 * sarması — `Card` bunları bilmez.
 */

interface PlanSheetProps {
  children: ReactNode;
  className?: string;
}

export function PlanSheet({ children, className }: PlanSheetProps) {
  return <div className={cn("planSheet", className)}>{children}</div>;
}

interface PlanWeekSectionProps {
  /** Hafta aralığı — "10 – 16 Ağustos". */
  label: string;
  /** `aria-labelledby` bağlantısı için kararlı kimlik. */
  id: string;
  children: ReactNode;
}

/**
 * Hafta bölümü — yapışkan cam başlıklı.
 *
 * Başlık yapışkan olmak ZORUNDA: ay artık dikey bir akış ve tutamaksız
 * bir listede hangi haftaya bakıldığı kaybolur. Cam olması da bir
 * tercih değil doğru cevap — altından gün satırları geçiyor ve
 * malzeme tam olarak bunun için var.
 */
export function PlanWeekSection({ label, id, children }: PlanWeekSectionProps) {
  return (
    <section aria-labelledby={id} className="planWeekSection">
      <h2 id={id} className="planWeekLabel glassChrome glassChrome--top">
        {label}
      </h2>
      {children}
    </section>
  );
}
