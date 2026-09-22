/**
 * Odak oturumunun tipleri.
 *
 * Saf mantıktan (`zen.ts`) AYRI dosyada: tipleri hem saf mantık, hem
 * hook, hem de bileşenler okuyor ve hepsini `zen.ts`ten almak, çizim
 * katmanını saf mantık modülüne bağımlı kılardı.
 */

/** Sayaç modu. `free` yukarı sayar, `pomodoro` geri. */
export type FocusMode = "free" | "pomodoro";

/** Pomodoro süre profili — dakika cinsinden odak süresiyle adlandırılır. */
export type PomodoroProfileId = 25 | 50 | 90;

/** Pomodoro döngüsünün içinde bulunulan aşama. */
export type Phase = "focus" | "shortBreak" | "longBreak";

/**
 * Sayacın durumu — damga tabanlı.
 *
 * Saniye SAYILMIYOR, damga tutuluyor ve fark her tikte YENİDEN
 * hesaplanıyor. Gerekçe `useFocusTimer.ts`te: tarayıcı arka plandaki
 * sekmede zamanlayıcıları kısıtlıyor ve `count + 1` birikimli hata
 * üretiyor.
 *
 * `pausedTotalMs` GEÇMİŞ duraklamaların toplamı; `pausedAt` ise ŞU AN
 * duraklatılmışsa o anın damgası. İkisi ayrı çünkü biri kapanmış
 * aralıkları, diğeri açık bir aralığı temsil ediyor.
 */
export interface TimerState {
  startedAt: number;
  pausedTotalMs: number;
  pausedAt: number | null;
}

/**
 * Bir pomodoro süre profili.
 *
 * Üç hazır profil var, serbest dakika girişi YOK: sayı girdirmek
 * "doğru süreyi" bir ayar sorununa çeviriyor ve odak ekranının tek
 * işi karar sayısını azaltmak.
 */
export interface PomodoroProfile {
  id: PomodoroProfileId;
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
}
