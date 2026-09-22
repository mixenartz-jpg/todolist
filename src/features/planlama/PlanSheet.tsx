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
 * bileşen olmasının sebebi gün satırlarının ortak yüzeyini ve kıl
 * çizgi ayrımını taşıması — `Card` bunları bilmez.
 *
 * ── `PlanWeekSection` neden gitti? ──
 * Ay içi katlanır hafta bölümüydü ve ay ölçeği artık gün satırı
 * çizmiyor: `PlanMonthMap` haftaları özet satır olarak gösteriyor.
 * Katlanacak kırk iki satır kalmayınca katlama kontrolü de
 * gereksizleşti — "hafta" kelimesinin üç anlamından biri böylece
 * emekli oldu.
 */

interface PlanSheetProps {
  children: ReactNode;
  className?: string;
}

export function PlanSheet({ children, className }: PlanSheetProps) {
  return <div className={cn("planSheet", className)}>{children}</div>;
}
