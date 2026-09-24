/**
 * Yerleştirme kipi — saf mantık.
 *
 * Plan ekranında "bir şey seç, sonra bir güne bas" kipi zaten vardı
 * (havuzdaki görevi ızgaraya taşımak için). 0022 ile aynı kipe İKİNCİ
 * bir yerleştirilebilir tür girdi: ağaçtaki plan başlıkları.
 *
 * ── Neden mevcut kip genişletildi, yenisi açılmadı? ──
 * İki ayrı "seçili şey" durumu, iki ayrı vurgulama dili ve iki ayrı
 * Escape davranışı demekti; kullanıcı da aynı ekranda iki farklı
 * etkileşim öğrenirdi. Etiketli birleşim, tek kipi iki türe açıyor ve
 * klavye yolu ilk günden çalışıyor — sürükle-bırak bunun ÜSTÜNE
 * geliyor, yerine değil.
 *
 * ── Görev TAŞINIR, düğümden görev DOĞAR ──
 * İkisi aynı jest ama farklı sonuç ve arayüz bunu söylemeli. Aynı
 * cümleyi kullanmak, kullanıcıya ağaçtaki başlığın kaybolacağını
 * düşündürürdü.
 */

import { startOfIsoWeek } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";

/**
 * Şu an yerleştirilmeyi bekleyen şey; null → kip kapalı.
 *
 * `task` → havuzdan/ızgaradan seçilmiş görev, tarihi DEĞİŞECEK.
 * `node` → ağaçtan seçilmiş plan başlığı, ondan görev DOĞACAK.
 */
export type Placing =
  | { kind: "task"; id: string }
  | { kind: "node"; id: string }
  | null;

/** Bırakma hedefinin türü — ay ızgarasında hafta şeritleri de var. */
export type DropTarget = "week" | "month" | "week-cell";

export function isPlacingTask(
  placing: Placing,
): placing is { kind: "task"; id: string } {
  return placing !== null && placing.kind === "task";
}

export function isPlacingNode(
  placing: Placing,
): placing is { kind: "node"; id: string } {
  return placing !== null && placing.kind === "node";
}

/**
 * Bırakılan hedefin hangi güne karşılık geldiği.
 *
 * Gün hücrelerinde tarih aynen geçer. HAFTA ŞERİDİNE bırakma ise o
 * haftanın pazartesisine çözülür: "şu haftaya" demek pratikte
 * "haftanın başına" demek ve bir şeridin ortasına bırakılan kalemin
 * rastgele bir güne düşmesi şaşırtıcı olurdu.
 *
 * `startOfIsoWeek` kullanılıyor, elle bir çıkarma değil: pazar günü
 * ISO haftasının SON günü ve saf bir "gün numarası eksi" hesabı onu
 * bir sonraki haftaya kaydırırdı.
 */
export function resolveDropDate(date: DateStr, target: DropTarget): DateStr {
  return target === "week-cell" ? startOfIsoWeek(date) : date;
}

/**
 * Yerleştirme kipinin ekranda söylediği cümle.
 *
 * Hafta şeridinde pazartesiye düşeceğini AÇIKÇA yazıyor — yoksa
 * kullanıcı bıraktığı yerle düştüğü yer arasındaki farkı ancak
 * sonradan fark ederdi.
 */
export function placementLabel(placing: Placing, target: DropTarget): string {
  if (placing === null) return "";

  if (placing.kind === "task") {
    return target === "week-cell"
      ? "Görevi bir haftaya taşı — pazartesiye düşer"
      : "Görevi bir güne taşı";
  }

  return target === "week-cell"
    ? "Başlığı bir haftaya gönder — pazartesiye düşer"
    : "Başlığı bir güne gönder";
}
