"use client";

import type { ReactNode } from "react";
import type { DateStr } from "@/lib/date/types";
import { Chevron } from "@/components/Chevron";
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
  /** Haftanın açık iş sayısı — kapalıyken içeride ne olduğunu söyler. */
  openCount: number;
  collapsed: boolean;
  onToggle: () => void;
  /**
   * Yerleştirme modu — katlama GEÇİCİ olarak devre dışı kalır.
   *
   * Havuzdan bir görev seçildiğinde her gün bir bırakma hedefidir.
   * Kapalı haftalar DOM'dan çıksaydı o günlere iş atamanın hiçbir
   * yolu kalmazdı: kullanıcı önce haftayı bulup açmak zorunda kalır,
   * üstelik kapalı haftanın hâlâ hedef olduğunu söyleyen hiçbir
   * işaret yoktur. `PlanDayRow` aynı gerekçeyle katlı GÜNDE de
   * bırakma şeridini gizlemiyor.
   */
  /**
   * Yerleştirme modu. Bölümü ZORLA AÇMAZ — başlığa hafta düzeyinde
   * bir yerleştirme hedefi ekler (bkz. bileşen doc-block'u).
   */
  placing?: boolean;
  /** Hafta düzeyinde yerleştirmenin hedef günü: haftanın ilk günü. */
  weekStart?: DateStr;
  onPlace?: (date: DateStr) => void;
  /**
   * Bu haftanın hedefleri — başlıkta rozet olarak görünür.
   *
   * Aylık planda haftalık hedefleri görmek, 0014'ün kurduğu bağın
   * (haftalık hedef = aylık hedefin dilimi) Planlama'da ilk kez
   * görünür olması demek: o bağ yalnızca Bugün ekranının yan rayında
   * çiziliyordu.
   */
  goals?: readonly { id: string; title: string; done: boolean }[];
  children: ReactNode;
}

/**
 * Hafta bölümü — yapışkan cam başlıklı, katlanır.
 *
 * Başlık yapışkan olmak ZORUNDA: ay dikey bir akış ve tutamaksız bir
 * listede hangi haftaya bakıldığı kaybolur. Cam olması da bir tercih
 * değil doğru cevap — altından gün satırları geçiyor ve malzeme tam
 * olarak bunun için var.
 *
 * ── Başlığın kendisi düğme ──
 * Ayrı bir ok düğmesi koymak, tıklanabilir bir başlığın yanında ikinci
 * ve daha küçük bir hedef üretirdi. Başlığın tamamı katlama düğmesi:
 * hedef geniş, niyet tek.
 *
 * Gün satırındaki oktan FARKLI: orada tarih kanalı zaten gün panelini
 * açıyordu ve başlığa ikinci bir işlev bindirilemezdi. Hafta
 * başlığının başka bir işi yok.
 *
 * ── Yerleştirme modu bölümü ZORLA AÇMAZ ──
 * Önce `forceOpen` vardı: havuzdan bir görev seçilince tüm kapalı
 * haftalar açılıyordu, "yoksa oraya iş atamanın yolu kalmaz" diye.
 * Sonuç, seçim anında ekranın 42 satıra patlaması ve kullanıcının az
 * önce kapattığı haftaların geri açılmasıydı — ferahlatmanın tam
 * tersi.
 *
 * Yerine hafta başlığının kendisi bir hedef olur: kapalı hafta kapalı
 * kalır, ona iş atamak isteyen başlığa bırakır ve görev haftanın ilk
 * gününe düşer. Gün seçmek isteyen haftayı açar.
 */
export function PlanWeekSection({
  label,
  id,
  openCount,
  collapsed,
  onToggle,
  placing = false,
  weekStart,
  onPlace,
  goals,
  children,
}: PlanWeekSectionProps) {
  const open = !collapsed;
  /* Hafta hedefi YALNIZCA kapalıyken: açık haftada gün satırlarının
     kendi şeritleri zaten var ve ikisi üst üste binerdi. */
  const showWeekDrop =
    placing && collapsed && onPlace !== undefined && weekStart !== undefined;

  return (
    <section aria-labelledby={id} className="planWeekSection">
      <h2 className="planWeekLabel glassChrome glassChrome--top">
        <button
          type="button"
          id={id}
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`${id}-icerik`}
          className="planWeekToggle"
        >
          <Chevron open={!collapsed} />
          <span className="planWeekRange">{label}</span>
          {/*
            Sayı KAPALI haftada bilgi taşır: içeride iş var mı, açmadan
            anlaşılır. Açıkken de duruyor — günler tek tek sayılmadan
            haftanın ağırlığını veren tek ölçü o.

            Sıfırken gizlenir: "0 iş" bilgi değil gürültüdür ve ayda
            beş kez tekrarlanırdı (gün sayacıyla aynı kural).
          */}
          {openCount > 0 && (
            <span className="planWeekCount tabular">{openCount} iş</span>
          )}
        </button>
      </h2>

      {/*
        Haftanın hedefleri — başlığın ALTINDA, düğmenin dışında.
        İçine koymak tıklanabilir alanı hedeflerin üstüne yayardı ve
        "hedefe mi bastım, haftayı mı kapattım" belirsizliği doğardı.

        Katlama durumundan BAĞIMSIZ görünür: hafta kapalıyken bile "bu
        hafta neyi hedefliyordum" okunabilmeli — kapatmanın amacı gün
        satırlarını gizlemek, hedefi değil.
      */}
      {goals !== undefined && goals.length > 0 && (
        <ul className="planWeekGoals">
          {goals.map((goal) => (
            <li
              key={goal.id}
              className={cn("planWeekGoal", goal.done && "planWeekGoal--done")}
            >
              {goal.title}
            </li>
          ))}
        </ul>
      )}

      {showWeekDrop && (
        <button
          type="button"
          className="planDropStrip planWeekDrop"
          onClick={() => onPlace(weekStart)}
        >
          ＋ {label} haftasına koy
        </button>
      )}

      <div id={`${id}-icerik`}>{open && children}</div>
    </section>
  );
}
