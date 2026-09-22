import type {
  Phase,
  PomodoroProfile,
  PomodoroProfileId,
  TimerState,
} from "./types";

/**
 * Zen odak modunun saf mantığı.
 *
 * ── Sayaç neden iki MOD? ──
 * Eskiden yalnızca yukarı sayardı ve gerekçesi şuydu: geri sayan bir
 * sayaç hedef süre ister, hedefi tutturamamak da başarısızlık üretir.
 * Bu gerekçe HÂLÂ GEÇERLİ ve bu yüzden serbest mod VARSAYILAN kaldı.
 * Pomodoro yanına eklendi, yerine değil — hedefi isteyen seçiyor,
 * istemeyene dayatılmıyor.
 *
 * ── Süre neden artık KAYDEDİLİYOR? ──
 * Eskiden kaydedilmezdi ve gerekçesi şuydu: sayaç Zen'in AÇIK olduğu
 * süreyi ölçüyor, çalışılan süreyi değil — kullanıcı ekranı açık
 * bırakıp kahve içmiş olabilir ve ölçmediğimiz bir şeyi kaydetmek
 * veriyi yalancı yapar.
 *
 * O gerekçe DURAKLATMA YOKLUĞUNDAN doğuyordu. Artık duraklatma var
 * ve sekme 60 saniyeden uzun arka planda kalırsa sayaç kendiliğinden
 * duruyor (bkz. `useFocusTimer.ts`). Ölçülen şey artık gerçekten
 * çalışılan süreye yaklaşıyor; kayıt yalan söylemiyor.
 *
 * Kaydedilen değer `net_seconds` — duraklamalar DÜŞÜLMÜŞ süre. Ham
 * `ended_at - started_at` farkı kaydedilseydi tam da kaçındığımız
 * yalan geri gelirdi (bkz. 0021).
 */

/**
 * Geçen saniyeyi okunur süreye çevirir.
 *
 * Bir saatin altında `d:ss`, üstünde `s:dd:ss`. Saat kısmı sıfırken
 * yazılmaz: "0:05:12" ilk bakışta beş saat gibi okunuyor ve odak
 * ekranında tek iş, sayının anında anlaşılması.
 */
export function formatElapsed(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));

  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(secs)}`;
  return `${minutes}:${pad(secs)}`;
}

/**
 * İki zaman damgası arasındaki saniye.
 *
 * `Date.now()` DEĞİL parametre: saat okuyan bir fonksiyon test
 * edilemez. Aynı disiplin `today: DateStr` kuralının zaman
 * eksenindeki karşılığı.
 *
 * Negatif fark SIFIRA kırpılır: sistem saati geri alınırsa (yaz
 * saati, NTP düzeltmesi) sayaç geriye saymaya başlar ve "-3:12"
 * gösterirdi.
 */
export function elapsedSeconds(startedAt: number, now: number): number {
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

/** Sıfırdan başlayan, duraklatılmamış bir sayaç. */
export function startTimer(now: number): TimerState {
  return { startedAt: now, pausedTotalMs: 0, pausedAt: null };
}

/**
 * Sayacı duraklatır.
 *
 * Zaten duraklatılmışsa AYNI nesneyi döndürür — ikinci bir damga
 * yazmak, ilk duraklamanın başlangıcını kaybettirir ve o aralık net
 * süreye geri sayılırdı.
 */
export function pauseTimer(state: TimerState, at: number): TimerState {
  if (state.pausedAt !== null) return state;
  return { ...state, pausedAt: at };
}

/**
 * Sayacı sürdürür ve duraklama süresini toplama yazar.
 *
 * Duraklatılmamışsa AYNI nesneyi döndürür: `pausedAt === null` iken
 * fark hesaplamak `at - null` demek olurdu.
 *
 * Fark NEGATİFSE sıfır eklenir (saat geri alınmış olabilir); negatif
 * bir duraklama toplamı, net süreyi gerçekte olduğundan UZUN
 * gösterirdi.
 */
export function resumeTimer(state: TimerState, at: number): TimerState {
  if (state.pausedAt === null) return state;

  const pausedMs = Math.max(0, at - state.pausedAt);

  return {
    startedAt: state.startedAt,
    pausedTotalMs: state.pausedTotalMs + pausedMs,
    pausedAt: null,
  };
}

/**
 * Duraklamalar düşülmüş net süre, saniye.
 *
 * Şu an duraklatılmışsa AÇIK aralık da düşülüyor — yoksa duraklatma
 * düğmesine basıp bekleyen kullanıcının sayacı ekranda ilerlemeye
 * devam ederdi.
 *
 * Sıfıra kırpma `elapsedSeconds` ile aynı gerekçe: sistem saati geri
 * alınırsa sayaç "-3:12" gösterirdi.
 */
export function netSeconds(state: TimerState, now: number): number {
  const openPauseMs =
    state.pausedAt === null ? 0 : Math.max(0, now - state.pausedAt);

  const netMs = now - state.startedAt - state.pausedTotalMs - openPauseMs;

  return Math.max(0, Math.floor(netMs / 1000));
}

/**
 * Kaç odak turundan sonra uzun mola gelir.
 *
 * Dört, klasik pomodoro sayısı ve sabit tutuluyor: profil başına
 * farklı bir tur sayısı, kullanıcının aklında tutması gereken ikinci
 * bir kural olurdu.
 */
export const ROUNDS_BEFORE_LONG_BREAK = 4;

/**
 * Üç hazır süre profili.
 *
 * `id` odak dakikasıyla AYNI sayı: arayüzde "25 · 50 · 90" diye
 * çizilip seçiliyor ve ayrı bir etiket taşımak, aynı bilgiyi iki
 * yerde tutmak olurdu.
 *
 * 90/20 profili sınav çalışması için: iki saatlik bir deneme
 * oturumunu 25 dakikaya bölmek, oturumun kendisini bozar.
 */
export const POMODORO_PROFILES: readonly PomodoroProfile[] = [
  { id: 25, focusMin: 25, shortBreakMin: 5, longBreakMin: 15 },
  { id: 50, focusMin: 50, shortBreakMin: 10, longBreakMin: 20 },
  { id: 90, focusMin: 90, shortBreakMin: 20, longBreakMin: 30 },
] as const;

/**
 * Kimliğe göre profil.
 *
 * Bulunamazsa İLK profile düşer, hata FIRLATMAZ: `localStorage`'da
 * eski ya da bozuk bir değer kalmış olabilir ve odak ekranının
 * tamamen çökmesi orantısız bir ceza olurdu.
 */
export function profileById(id: PomodoroProfileId): PomodoroProfile {
  return POMODORO_PROFILES.find((p) => p.id === id) ?? POMODORO_PROFILES[0];
}

/** Bir aşamanın toplam süresi, saniye. */
export function phaseSeconds(profile: PomodoroProfile, phase: Phase): number {
  if (phase === "focus") return profile.focusMin * 60;
  if (phase === "shortBreak") return profile.shortBreakMin * 60;
  return profile.longBreakMin * 60;
}

/**
 * Bu aşamadan sonra hangi aşama gelir.
 *
 * `completedFocusRounds` BİTMİŞ odak turlarının sayısı (bu aşama
 * dahil). Dördün katıysa uzun mola gelir.
 *
 * Fonksiyon aşamayı yalnızca HESAPLAR, başlatmaz: geri sayım bitince
 * ekran kendiliğinden geçmiyor, "mola başladı" deyip kullanıcıyı
 * bekliyor. Otomatik geçiş, masa başından kalkmış kullanıcının
 * molasını sessizce tüketirdi.
 */
export function nextPhase(phase: Phase, completedFocusRounds: number): Phase {
  if (phase !== "focus") return "focus";

  return completedFocusRounds % ROUNDS_BEFORE_LONG_BREAK === 0
    ? "longBreak"
    : "shortBreak";
}

/**
 * Geri sayımda kalan saniye.
 *
 * Sıfırın altına DÜŞMEZ: sekme arka planda kalıp tikler atlandığında
 * `elapsed` hedefi aşabilir ve sayaç negatif göstermeye başlardı.
 */
export function remainingSeconds(
  totalSeconds: number,
  elapsed: number,
): number {
  return Math.max(0, totalSeconds - elapsed);
}
