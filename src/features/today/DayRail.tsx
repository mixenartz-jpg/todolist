"use client";

import { useMemo } from "react";
import { cn } from "@/lib/ui/cn";
import type { DateStr } from "@/lib/date/types";
import type { EntryMap } from "@/features/entries/entry-map";
import type { RoutineWithSchedule } from "@/features/routines/types";
import type { Task } from "@/features/tasks/types";
import { SectionHeading } from "@/features/sections/SectionHeading";
import { DayPlanEditor } from "@/features/planlama/DayPlanEditor";
import { useMistakes } from "@/features/mistakes/queries";
import { ReviewStatsCard } from "@/features/mistakes/ReviewStatsCard";
import { buildDayClose } from "./daysummary";
import { DayCloseCard } from "./DayCloseCard";
import { RailMonthGoals } from "./RailMonthGoals";
import { RailWeekGoals } from "./RailWeekGoals";

/**
 * Gün rayı — Bugün ekranının sol sütunu.
 *
 * ── Ne işe yarıyor? ──
 * Günü KURMAK ve KAPATMAK için gereken her şey burada: günün planı,
 * haftanın ve ayın hedefleri, günün özeti. Bunlar daha önce üç ayrı
 * ekrana dağılmıştı — özellikle "günün planı" yalnızca Planlama →
 * Ay → gün paneli yolundan erişilebiliyordu, yani günü yaşadığın
 * ekranda günün planını yazamıyordun.
 *
 * ── Neden ayrı bir route değil? ──
 * "Günü başlat" diye ikinci bir ekran, aynı günü gösteren iki ekran
 * demekti ve kullanıcı her sabah hangisini açacağına karar vermek
 * zorunda kalırdı — çözmeye çalıştığı dağınıklığın aynısı. Sihirbaz
 * da olmaz: kapatılınca bağlam kaybolur ve tamamlanması gereken bir
 * tören, bir hafta içinde angaryaya döner.
 *
 * ── `DayPlanEditor` ile `DayNoteCard` aynı anda mount ──
 * İkisi de `qk.note(date)` anahtarına bağlı ve AYNI satırı yazıyor.
 * Bu GÜVENLİ, çünkü `useSaveDayPlan` ile `useSaveDayNote` kesişmeyen
 * sütun kümeleri yazacak şekilde tasarlandı (gerekçe migration
 * 0008'de). İkisi de sunucu verisini yalnızca `date` DEĞİŞİNCE yerel
 * duruma alır.
 *
 * Bunu bir efektin bağımlılığına çevirmeyin: iki bileşenin de
 * yorumunda yazdığı gibi, kullanıcı yazarken gelen her yanıt metni
 * geri sarar — imleç zıplar, son cümle kaybolur. Burada iki bileşen
 * yan yana durduğu için biri yazarken ötekinin sorgusu tazelenir ve
 * hata çok daha görünür biçimde ortaya çıkar.
 */
export function DayRail({
  today,
  entries,
  routines,
  tasks,
  onError,
  compact = false,
}: {
  today: DateStr;
  entries: EntryMap;
  routines: readonly RoutineWithSchedule[];
  tasks: readonly Task[];
  onError?: (message: string) => void;
  /**
   * Hafta ölçeğinde `true`: yalnızca GÜNE ait bloklar çizilir (plan +
   * gün özeti), hedefler atlanır.
   *
   * Hafta ızgarasının altında tam ray göstermek iki şeyi birden
   * bozardı: yedi günü kapsayan bir görünümde "günün planı" hangi
   * güne ait belirsiz kalır, ve hedefler zaten haftalık/aylık ölçekte
   * olduğu için ızgarayla birlikte tekrarlanmış olurlar. Ama planı ve
   * notu tamamen gizlemek de olmaz: kullanıcı hafta ölçeğine geçtiğinde
   * o günün notunu yazamaz duruma düşerdi.
   */
  compact?: boolean;
}) {
  /*
   * Yanlışlar zaten `ReviewQueue` tarafından çekiliyor; aynı anahtar
   * paylaşıldığı için bu ikinci `useMistakes()` yeni bir ağ isteği
   * açmaz, önbellekten okur.
   */
  const mistakesQuery = useMistakes();

  const close = useMemo(
    () =>
      buildDayClose({
        entries,
        routines,
        tasks,
        mistakes: mistakesQuery.data ?? [],
        today,
      }),
    [entries, routines, tasks, mistakesQuery.data, today],
  );

  return (
    <aside
      aria-label="Gün paneli"
      /*
       * Masaüstünde SABİT genişlik: ray bir okuma sütunu ve içeriği
       * (hedef başlıkları, kısa sayılar) geniş bir sütunda seyrelirdi.
       * `shrink-0` ile ızgara büyüdüğünde ezilmez; mobilde tam
       * genişliğe döner.
       */
      className={cn(
        "flex w-full flex-col gap-[var(--stack-gap)]",
        // Compact (hafta ölçeği) ızgaranın ALTINDA tam genişlikte
        // durur; yan sütun değil.
        !compact && "md:w-64 md:shrink-0",
      )}
    >
      <section>
        <SectionHeading sectionKey="today.plan" onError={onError} />
        {/*
         * `DayPlanEditor` kendi `SectionHeading`'ini taşıyor
         * (`planlama.dayPlan`) — burada `heading={false}` ile
         * kapatılıyor ki rayda iki başlık üst üste çizilmesin.
         */}
        <DayPlanEditor date={today} onError={onError} heading={false} />
      </section>

      {!compact && (
        <>
          <RailWeekGoals today={today} onError={onError} />
          <RailMonthGoals today={today} onError={onError} />

          {/* Yanlış çetelesi. Hedeflerden SONRA çünkü hedefler bu ayın
              işi, çetele ise tüm zamanların birikimi — dar olandan
              geniş olana.

              Başlık kartın İÇİNDE: hiç yanlış yokken kart kendini
              çizmiyor ve başlığı burada tutmak, altı boş bir
              "Yanlış çetelesi" başlığı bırakırdı. */}
          <ReviewStatsCard today={today} onError={onError} />
        </>
      )}

      <section>
        <SectionHeading sectionKey="today.close" onError={onError} />
        <DayCloseCard date={today} close={close} onError={onError} />
      </section>
    </aside>
  );
}
