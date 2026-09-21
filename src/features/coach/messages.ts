/**
 * Koçluk cümlelerinin TEK kaynağı — saf mantık.
 *
 * ── Neden hepsi tek dosyada ve bileşenlerin dışında? ──
 * Bir araç sana listeyi gösterir; bir koç sana ne yapman gerektiğini
 * söyler. O cümleler ürünün sesidir ve ses dağınık olamaz: aynı şey
 * iki ekranda iki türlü söylenirse ortada bir koç değil, birbirinden
 * habersiz iki yazar vardır.
 *
 * Ayrıca koçluk cümleleri bu depodaki EN KOLAY BOZULAN şey. "Seri 1"
 * için "1 gündür aksatmadın" yazmak komik olur; doğrusu "bugün
 * başladın"dır. Bu tür sınır durumları ancak testle yakalanır ve bu
 * depoda yalnızca `.test.ts` çalışıyor — React test kütüphanesi yok.
 * Cümleler bileşene gömülseydi hiçbir test onlara ulaşamazdı.
 *
 * ── Uyulması zorunlu beş kural ──
 * 1. Sayı tek başına yetmez; yorum ve sonraki adım eşlik eder.
 * 2. Motivasyon VERİYE dayanır. "Harikasın!" yasak — doğrulanamayan
 *    hiçbir övgü yazılmaz. "Geçen haftadan %12 öndesin" serbest,
 *    çünkü `trendDelta` bunu ölçüyor.
 * 3. Kötü haber de söylenir, SUÇLAMADAN. "Başarısızsın" değil,
 *    "9 gündür bu hedefe hiç görev bağlamadın".
 * 4. Her cümle bir eyleme bağlanır. Çıkmaz sokak yorum yasak.
 * 5. `null` ≠ `0`. Ölçülmeyen şey başarısızlık gibi gösterilmez.
 *
 * ── Devralınan yasak ──
 * Koç "serin gitti" DİYEMEZ. `streak.ts`'in tolerans kuralı seriyi
 * bugün kırmıyor — gün bitmedi. En fazla "bugüne bakıyor" denir.
 */

import { formatPercent } from "@/lib/ui/tr";
import type { DayClose } from "@/features/today/daysummary";
import type { StreakResult, StreakUnit } from "@/features/stats/streak";
import type { TrendDelta } from "@/features/stats/trend";
import type { GoalPace } from "@/features/planlama/pace";

export interface CoachLine {
  /** Büyük satır: sayı ya da kısa gerçek. */
  headline: string;
  /** Altındaki yorum. null = yorum gerektirmeyen durum. */
  detail: string | null;
  /**
   * Sonraki adım. null YALNIZCA kutlama anlarında meşrudur: "rekor
   * kırdın" cümlesinin eylemi yoktur, yapılacak şey zaten yapılmıştır.
   */
  action: { label: string; href: string } | null;
  /**
   * Ton — glow yoğunluğunu seçer.
   *
   * `"warn"` BİLEREK ışımaz: glow bir ödüldür, ceza değil.
   */
  tone: "good" | "neutral" | "warn";
}

/** Serinin birimi Türkçede: "12 gün", "5 hafta". */
const UNIT_LABEL: Record<StreakUnit, string> = {
  day: "gün",
  week: "hafta",
  month: "ay",
};

/**
 * Seri cümlesi.
 *
 * Dört ayrı durum, dördü de farklı cümle hak ediyor — tek bir şablona
 * sıkıştırmak ("{n} {birim} seri") sayı 0 ve 1 iken saçmalardı.
 */
export function streakLine(streak: StreakResult): CoachLine {
  const unit = UNIT_LABEL[streak.unit];

  if (streak.current === 0) {
    return {
      headline: "Seri yok",
      /*
       * Rekor VARSA söylenir: kullanıcının bir kez başardığını
       * hatırlatmak, sıfırdan başlıyormuş hissini kırar. Yoksa hiç
       * anılmaz — "en uzun serin 0" bir bilgi değil.
       */
      detail:
        streak.longest > 0
          ? `En uzun serin ${streak.longest} ${unit}. Bugün yeniden başlayabilirsin.`
          : "Bugün işaretlersen seri başlar.",
      action: { label: "Bugüne git", href: "/bugun" },
      tone: "neutral",
    };
  }

  // Rekorun KIRILDIĞI an — kutlanacak üç durumdan biri.
  if (streak.current > streak.longest) {
    return {
      headline: `${streak.current} ${unit} — yeni rekor`,
      detail: `Önceki en uzun serin ${streak.longest} ${unit}di.`,
      // Eylem YOK: yapılacak şey zaten yapılmış.
      action: null,
      tone: "good",
    };
  }

  if (streak.current === streak.longest) {
    return {
      headline: `${streak.current} ${unit}`,
      detail: `En uzun serine eşitledin. Bir ${unit} daha rekor demek.`,
      action: { label: "Bugüne git", href: "/bugun" },
      tone: "good",
    };
  }

  const remaining = streak.longest - streak.current;

  return {
    headline: `${streak.current} ${unit}`,
    /*
     * Tek cümlede iki bilgi: nerede olduğun ve rekora ne kadar
     * kaldığı. İkincisi olmadan sayı bir puan tabelasıdır; onunla
     * birlikte bir hedef olur.
     */
    detail: `En uzun serin ${streak.longest} ${unit} — ${remaining} ${unit} kaldı.`,
    action: { label: "Bugüne git", href: "/bugun" },
    tone: "neutral",
  };
}

/**
 * Trend cümlesi: bu hafta geçen haftaya göre.
 *
 * `null` delta (tek haftalık veri) burada da `null` döndürmez, çünkü
 * çağıran bir `CoachLine` bekliyor — ama SÖYLENECEK BİR ŞEY OLMADIĞINI
 * bildirmek için fonksiyon `null` döner ve `pick` onu atlar. Uydurma
 * bir "veri toplanıyor" cümlesi yazmak, boş bir yorumu koçluk diye
 * sunmak olurdu.
 */
export function trendLine(delta: TrendDelta | null): CoachLine | null {
  if (delta === null) return null;

  const points = Math.round(Math.abs(delta.delta) * 100);

  /*
   * Tek puanlık oynamalar gürültüdür. Eşik 3 puan: altında "aynı
   * tempo" denir, çünkü "%1 öndesin" ölçüm hassasiyetinin altında bir
   * iddiadır ve koçu güvenilmez yapar.
   */
  if (points < 3) {
    return {
      headline: "Aynı tempo",
      detail: `Bu hafta ${formatPercent(delta.current)}, geçen hafta ${formatPercent(delta.previous)}.`,
      action: null,
      tone: "neutral",
    };
  }

  if (delta.delta > 0) {
    return {
      headline: `Geçen haftadan %${points} öndesin`,
      detail: `Bu hafta ${formatPercent(delta.current)}, geçen hafta ${formatPercent(delta.previous)}.`,
      action: null,
      tone: "good",
    };
  }

  return {
    headline: `Geçen haftadan %${points} geridesin`,
    // Suçlama yok, gerçek var — ve arkasından bir eylem.
    detail: `Bu hafta ${formatPercent(delta.current)}, geçen hafta ${formatPercent(delta.previous)}.`,
    action: { label: "Bugüne git", href: "/bugun" },
    tone: "warn",
  };
}

/**
 * Serinin bugüne baktığı uyarısı.
 *
 * Koçun tek meşru aciliyet cümlesi. "Serin gitti" ASLA — gitmedi.
 */
export function atRiskLine(routineName: string, streak: number): CoachLine {
  return {
    headline: `${streak} günlük serin bugüne bakıyor`,
    detail: `${routineName} bugün henüz işaretlenmedi.`,
    action: { label: "Şimdi işaretle", href: "/bugun" },
    tone: "warn",
  };
}

/**
 * Günün durumu.
 *
 * `DayClose` tipi GENİŞLETİLMEDİ: `daysummary.ts` bilinçli olarak
 * `score` alanını dışlıyor ("ikinci kopya = iki bağımsız doğruluk
 * kaynağı"). Cümle buradan, ayrı bir modülden geliyor ve onun
 * çıktısını yalnızca OKUYOR.
 */
export function dayLine(close: DayClose): CoachLine {
  const done = close.routines.done + close.tasks.done;
  const total = close.routines.total + close.tasks.total;

  /*
   * Ölçülecek bir şey yoksa oran da yok — `null` ≠ `0`. "%0 tamamladın"
   * demek, olmayan bir işi yapmamakla suçlamaktır.
   */
  if (total === 0) {
    return {
      headline: "Bugün için planlanmış iş yok",
      detail: "Bir görev ekleyerek güne yön verebilirsin.",
      action: { label: "Görev ekle", href: "/bugun" },
      tone: "neutral",
    };
  }

  if (done === total) {
    return {
      headline: `${done}/${total} — gün tamam`,
      detail: "Bugünün her işi bitti.",
      action: null,
      tone: "good",
    };
  }

  const remaining = total - done;

  if (done === 0) {
    return {
      headline: `0/${total}`,
      detail: `Bugün için ${total} iş duruyor. İlkini bitirmek en zoru.`,
      action: { label: "Bugüne git", href: "/bugun" },
      tone: "neutral",
    };
  }

  return {
    headline: `${done}/${total}`,
    detail: `${remaining} iş kaldı.`,
    action: { label: "Bugüne git", href: "/bugun" },
    tone: "neutral",
  };
}

/**
 * Hedef temposu cümlesi.
 *
 * `goalProgress` "neredeyim" der, `goalPace` "yetişiyor muyum" der;
 * bu cümle ikincisini Türkçeye çevirir. `noTarget` durumunda `null`
 * döner — ölçmediğimiz bir hedef hakkında konuşmak uydurmaktır ve
 * `goalProgress`'in `none` modunun arayüzdeki karşılığı susmaktır.
 */
export function paceLine(pace: GoalPace, goalTitle: string): CoachLine | null {
  if (pace.verdict === "noTarget") return null;

  /** "günde 4 soru gerekiyor" — yalnızca sayısal hedeflerde var. */
  const needed =
    pace.perDayNeeded === null
      ? null
      : `Yetişmek için günde ${pace.perDayNeeded}.`;

  if (pace.verdict === "ahead") {
    return {
      headline: `${goalTitle} — öndesin`,
      detail: `${formatPercent(pace.actual)} tamam, bu tarihte beklenen ${formatPercent(pace.expected)}.`,
      action: null,
      tone: "good",
    };
  }

  if (pace.verdict === "behind") {
    return {
      headline: `${goalTitle} — geridesin`,
      // Suçlama yok: iki sayı ve bir talimat.
      detail: `${formatPercent(pace.actual)} tamam, bu tarihte beklenen ${formatPercent(pace.expected)}.${needed ? ` ${needed}` : ""}`,
      action: { label: "Görev ekle", href: "/bugun" },
      tone: "warn",
    };
  }

  return {
    headline: `${goalTitle} — yolunda`,
    detail: needed ?? `${formatPercent(pace.actual)} tamam.`,
    action: null,
    tone: "neutral",
  };
}

/**
 * Unutulmuş hedef uyarısı.
 *
 * Koçun "kötü haberi suçlamadan söyleme" kuralının en saf örneği:
 * "Üçgenler hedefine 9 gündür hiç görev bağlamadın" bir gerçek,
 * eyleme dönük ve yargısız. "Bu hedefi ihmal ediyorsun" olmazdı.
 *
 * `null` döner: hedefe hiç görev bağlanmamışsa (o zaman "kaç gündür"
 * sorusunun başlangıcı yok) ya da boşluk eşiğin altındaysa. Üç gün
 * bir ihmal değil, bir hafta sonu.
 */
export function idleGoalLine(
  goalTitle: string,
  daysIdle: number | null,
): CoachLine | null {
  /** Bir hafta: altındaki boşluk normal bir ritmin parçası olabilir. */
  const IDLE_THRESHOLD = 7;

  if (daysIdle === null || daysIdle < IDLE_THRESHOLD) return null;

  return {
    headline: `${goalTitle} bekliyor`,
    detail: `${daysIdle} gündür bu hedefe hiç görev bağlamadın.`,
    action: { label: "Görev ekle", href: "/bugun" },
    tone: "warn",
  };
}

/**
 * Haftanın zayıf günü.
 *
 * `weekdayBreakdown` bu veriyi ZATEN hesaplıyor ve hiçbir ekran
 * çizmiyordu. Koçluğun en güçlü cümlelerinden biri sıfır yeni hesapla
 * buradan doğuyor.
 *
 * `null` döner: yeterli veri yoksa. Bir günü "zayıf" ilan etmek için
 * en az birkaç ölçüm gerekir — tek bir kötü Çarşamba bir örüntü
 * değildir ve koç örüntü olmayan şeye örüntü diyemez.
 */
export function weakDayLine(
  breakdown: ReadonlyArray<{ weekday: number; ratio: number; days: number }>,
  weekdayNames: readonly string[],
): CoachLine | null {
  /** Bir günün "örüntü" sayılması için gereken en az ölçüm sayısı. */
  const MIN_DAYS = 3;

  const measured = breakdown.filter((b) => b.days >= MIN_DAYS);
  if (measured.length < 2) return null;

  const worst = measured.reduce((a, b) => (b.ratio < a.ratio ? b : a));
  const best = measured.reduce((a, b) => (b.ratio > a.ratio ? b : a));

  // Hepsi birbirine yakınsa zayıf gün YOKTUR — uydurmak yerine susulur.
  if (best.ratio - worst.ratio < 0.15) return null;

  return {
    headline: `${weekdayNames[worst.weekday]} günleri zayıf`,
    detail: `O günlerde ortalama ${formatPercent(worst.ratio)}, en iyi günün ${weekdayNames[best.weekday]} (${formatPercent(best.ratio)}).`,
    action: { label: "Planı gözden geçir", href: "/planlama" },
    tone: "warn",
  };
}
