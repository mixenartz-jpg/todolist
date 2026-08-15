"use client";

import { useState } from "react";
import type { DateStr } from "@/lib/date/types";
import { useDebouncedCallback } from "@/lib/ui/useDebouncedCallback";
import { useSaveMonthPlan } from "./mutations";
import { useMonthPlan } from "./queries";
import { MONTH_PLAN_MAX } from "./types";

const AUTOSAVE_DELAY_MS = 800;

/**
 * Ayın genel planı — serbest metin.
 *
 * `DayPlanEditor` ile AYNI autosave deseni ("Kaydet" düğmesi yok; plan
 * yazmak bir form doldurma işi değil) ama başka bir ÖLÇEK: orası tek
 * günü ileriye dönük planlar, burası ayın tamamına dair düşünceyi tutar
 * ("bu ay neye odaklanıyorum, hangi riskler var").
 *
 * Hedeflerden de ayrıdır ve bilerek: `plan_goals` yapılandırılmış bir
 * listedir (başlık + sayaç + renk), burası yapılandırılmamış alan.
 * İkisini tek ekranda birleştirmek, yazarken her düşünceyi bir hedefe
 * dönüştürmeye zorlamak olurdu.
 */
export function MonthPlanEditor({
  month,
  onError,
}: {
  month: DateStr;
  onError?: (message: string) => void;
}) {
  const { data: monthPlan } = useMonthPlan(month);
  const save = useSaveMonthPlan(onError);

  const [body, setBody] = useState("");

  /*
   * Sunucu verisi yalnızca AY DEĞİŞTİĞİNDE yerel duruma alınır.
   * `monthPlan`'ı bir efektin bağımlılığına koymak, kullanıcı yazarken
   * gelen her yanıtın metni geri sarmasına yol açardı — imleç zıplar,
   * son cümle kaybolur (DayPlanEditor'daki aynı gerekçe).
   *
   * `monthPlan` satır yokken de tanımlıdır (boş gövde döner), bu yüzden
   * `undefined` kontrolü burada gerçekten "yanıt geldi mi" sorusudur.
   */
  const [loadedMonth, setLoadedMonth] = useState<DateStr | null>(null);
  if (monthPlan !== undefined && loadedMonth !== month) {
    setLoadedMonth(month);
    setBody(monthPlan.body);
  }

  const debouncedSave = useDebouncedCallback((next: string) => {
    save.mutate({ month, body: next });
  }, AUTOSAVE_DELAY_MS);

  /*
   * Veri gelene kadar iskelet: editörü boş metinle göstermek,
   * kullanıcının yanıt gelmeden yazmaya başlamasına ve yukarıdaki
   * senkron guard'ının yazdığını EZMESİNE yol açardı.
   */
  if (monthPlan === undefined) {
    return (
      <div
        className="h-64 animate-pulse rounded-lg bg-[var(--color-surface-2)]"
        aria-hidden
      />
    );
  }

  return (
    <div>
      <textarea
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          debouncedSave.call(event.target.value);
        }}
        // Sekme değişmeden önce bekleyen yazma zorlanır: `flush`
        // olmasaydı son 800ms'lik yazı kaydedilmeden kaybolurdu.
        // Sekmeler <Link> ile geçtiği için blur güvenilir biçimde
        // tetiklenir.
        onBlur={() => debouncedSave.flush()}
        maxLength={MONTH_PLAN_MAX}
        /*
         * 14 satır — `DayPlanEditor`'ın 4'ünün aksine. Burası bir
         * düşünme yüzeyidir; dört satırlık bir kutu, uzun yazmayı
         * fiziksel olarak caydırır ve alanın ne için olduğunu yanlış
         * anlatırdı.
         */
        rows={14}
        placeholder="Bu ay neye odaklanıyorsun? Hangi konular geride kaldı, neyi denemek istiyorsun…"
        className="w-full resize-y rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2.5 text-[length:var(--text-base)] leading-relaxed outline-none transition-colors duration-[var(--duration-fast)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-line-3)]"
      />

      <p
        aria-live="polite"
        className="mt-1.5 h-4 text-[length:var(--text-xs)] text-[var(--color-ink-3)]"
      >
        {save.isPending ? "Kaydediliyor…" : save.isSuccess ? "Kaydedildi" : ""}
      </p>
    </div>
  );
}
