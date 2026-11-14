/**
 * Panel uyarı eşikleri — TEK YER. Bir eşiği değiştirmek için yalnızca
 * buradaki sayıyı değiştir; hesap `alerts.ts`'te, testler de bu
 * sabitleri okur.
 */
export const ALERT_THRESHOLDS = {
  /** Günlük form üst üste bu kadar gün (dünden geriye) boşsa uyar. */
  formMissingDays: 2,
  /** Tamamlanma `ratio`'nun altında kalan `days` ardışık gün. */
  lowCompletion: { ratio: 0.5, days: 3 },
  /** Son `days` kayıtlı gecenin ortalama uykusu bu saatin altındaysa. */
  minSleepHours: 6,
  sleepWindowDays: 3,
  /** Aynı görev en az bu kadar kez "yapılmadı" işaretlendiyse. */
  repeatSkip: 2,
  /** "Aynı görev" taraması bu kadar gün geriye bakar. */
  repeatSkipWindowDays: 14,
} as const;

export type AlertThresholds = typeof ALERT_THRESHOLDS;

/**
 * Planlama eşikleri — Dağıt önizlemesi. Günün toplam süresi (mevcut
 * görevler + dağıtım) bunu aşarsa satır sarı olur.
 */
export const PLAN_THRESHOLDS = {
  /** Dakika. 6 sa. */
  dailyMinutesWarn: 360,
} as const;
