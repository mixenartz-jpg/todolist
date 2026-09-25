/**
 * Görevin tahmini süresi — biçim ve girdi kuralları.
 *
 * Saf fonksiyonlar: satırdaki çip (`TaskItem`) ve seçici aynı kuralı
 * okur, testler de buradan sınanır.
 */

/** Şemadaki sınır (0023): bir dakika ile bir gün arası. */
export const ESTIMATE_MIN = 1;
export const ESTIMATE_MAX = 1440;

/**
 * Seçicideki hazır değerler, dakika.
 *
 * Çalışma bloklarının doğal boyları: kısa bir tekrar (15), bir ders
 * videosu (30–45), bir deneme (2–3 saat). Başka bir değer "Özel"
 * kutusundan yazılır.
 */
export const ESTIMATE_PRESETS: readonly number[] = [15, 30, 45, 60, 90, 120, 180, 240];

/**
 * Dakikayı satırdaki çipin metnine çevirir.
 *
 *   15  → "15 dak"
 *   60  → "1 saat"
 *   90  → "1,5 saat"
 *   100 → "1 sa 40 dak"
 *
 * Yarım saatler ondalıkla yazılıyor: "1 sa 30 dak" dar sütunda
 * "1,5 saat"ten iki kat yer kaplıyor ve aynı şeyi söylüyor.
 */
export function formatEstimate(minutes: number): string {
  if (minutes < 60) return `${minutes} dak`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (rest === 0) return `${hours} saat`;
  if (rest === 30) return `${hours},5 saat`;
  return `${hours} sa ${rest} dak`;
}

/**
 * Bir günün toplam tahmini — tahmini olmayan görevler sayılmaz.
 * Hiçbirinde tahmin yoksa null: "0 dak" yazmak, "hiç iş yok" diye
 * yanlış okunurdu.
 */
export function totalEstimate(
  tasks: readonly { estimateMinutes: number | null }[],
): number | null {
  let total = 0;
  let any = false;
  for (const t of tasks) {
    if (t.estimateMinutes === null) continue;
    total += t.estimateMinutes;
    any = true;
  }
  return any ? total : null;
}

/** Bir günün tahmini yükü: planlanan ve bitirilen süre, dakika. */
export interface DayLoad {
  /** Tahmini olan TÜM görevlerin toplamı. */
  planned: number;
  /** Bunların BİTMİŞ olanlarının toplamı — "bugün ne kadar çalıştım". */
  done: number;
}

/**
 * Günün yükü. Hiçbir görevde tahmin yoksa null (bkz. `totalEstimate`).
 *
 * Bitmiş ama tahmini olmayan görev `done`'a GİRMEZ: kaç dakika
 * sürdüğünü bilmiyoruz ve sıfır saymak da bir tahmin uydurmaktır.
 */
export function dayLoad(
  tasks: readonly { estimateMinutes: number | null; done: boolean }[],
): DayLoad | null {
  const planned = totalEstimate(tasks);
  if (planned === null) return null;
  const done = totalEstimate(tasks.filter((t) => t.done)) ?? 0;
  return { planned, done };
}

/**
 * "Özel" kutusunun girdisini dakikaya çevirir; geçersizse null.
 *
 * Kabul edilenler: düz sayı dakikadır ("40"), "sa"/"saat" ya da "s"
 * ile biten sayı saattir ("1,5 saat", "2s"), ikisi birlikte de olur
 * ("1 sa 20 dak"). Ondalık ayırıcı virgül de nokta da olabilir.
 */
export function parseEstimateInput(input: string): number | null {
  const text = input.trim().toLocaleLowerCase("tr").replace(",", ".");
  if (text.length === 0) return null;

  const match = text.match(
    /^(?:(\d+(?:\.\d+)?)\s*(?:saat|sa|s)\b\.?)?\s*(?:(\d+)\s*(?:dakika|dak|dk|d)?\.?)?$/,
  );
  if (!match || (match[1] === undefined && match[2] === undefined)) return null;

  const hours = match[1] === undefined ? 0 : Number(match[1]);
  const mins = match[2] === undefined ? 0 : Number(match[2]);
  const total = Math.round(hours * 60 + mins);

  if (!Number.isFinite(total) || total < ESTIMATE_MIN || total > ESTIMATE_MAX) {
    return null;
  }
  return total;
}

/**
 * Yeni görevin adının SONUNA yazılmış süreyi ayırır.
 *
 *   "Paragraf rutini 30dk"     → { title: "Paragraf rutini", 30 }
 *   "TYT denemesi 2 saat"      → { title: "TYT denemesi", 120 }
 *   "Geometri 1 sa 20 dk"      → { title: "Geometri", 80 }
 *   "Paragraf | 30 Soru"       → süre yok (birim yok)
 *   "Deneme (30 Soru ~ 40dk)"  → süre yok (sonda parantez var)
 *
 * Birim ZORUNLU: "TYT Deneme 2" gibi bir addaki sayı süre değildir.
 * Yalnızca SONDAKİ ifade okunur — ortadaki "40 dk" adın parçasıdır.
 * Süre çıkarılınca ad boş kalıyorsa hiçbir şey ayrılmaz ("30dk" adlı
 * bir görev, adsız kalmaktan iyidir).
 */
export function splitEstimateFromTitle(input: string): {
  title: string;
  estimateMinutes: number | null;
} {
  const text = input.trim();
  const match = text.match(
    /^(.*?\S)\s+(?:(\d+(?:[.,]\d+)?)\s*(?:saat|sa|s)(?:\s*(\d+)\s*(?:dakika|dak|dk))?|(\d+)\s*(?:dakika|dak|dk))\.?$/i,
  );
  if (!match) return { title: text, estimateMinutes: null };

  const [, rest, hours, extraMinutes, minutesOnly] = match;
  const total =
    hours !== undefined
      ? Math.round(Number(hours.replace(",", ".")) * 60 + Number(extraMinutes ?? 0))
      : Number(minutesOnly);

  if (!Number.isFinite(total) || total < ESTIMATE_MIN || total > ESTIMATE_MAX) {
    return { title: text, estimateMinutes: null };
  }
  return { title: rest.trim(), estimateMinutes: total };
}
