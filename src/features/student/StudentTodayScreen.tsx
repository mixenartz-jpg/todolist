"use client";

import { DayView } from "@/features/day/DayView";
import { useViewer } from "@/lib/auth/ViewerProvider";
import { todayStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";

/**
 * Öğrencinin ana ekranı. Koç aynı ekranı salt okunur önizler.
 * Yerleşimin tamamı `DayView`'da — koçun Planlama → Gün görünümüyle
 * ortak.
 */
export function StudentTodayScreen({ day }: { day: DateStr | null }) {
  const viewer = useViewer();
  const today = todayStr();
  return (
    <DayView
      mode={viewer.readOnly ? "preview" : "student"}
      date={day ?? today}
      hrefFor={(d) => (d === today ? "/ogrenci/bugun" : `/ogrenci/bugun?gun=${d}`)}
    />
  );
}
