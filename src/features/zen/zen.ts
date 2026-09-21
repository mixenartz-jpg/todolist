/**
 * Zen odak modunun saf mantığı.
 *
 * ── Sayaç neden YUKARI sayıyor? ──
 * Geri sayan bir sayaç hedef süre ister ("25 dakika çalış") ve o
 * hedefi tutturamamak bir başarısızlık üretir. Bu uygulamada süre
 * hedefi hiçbir yerde yok — `duration_minutes` sütunu bile kaldırıldı
 * (0016). Yukarı sayan sayaç "ne kadar odaklandım" sorusunu
 * cevaplıyor ve o sorunun yanlış cevabı yok.
 *
 * ── Süre neden KAYDEDİLMİYOR? ──
 * Oturum bitince sayaç sıfırlanır ve hiçbir yere yazılmaz. Yazmak
 * `completed_at`ten farklı bir şey iddia etmek olurdu: "bu işe şu
 * kadar çalıştın". Oysa sayaç yalnızca Zen'in AÇIK olduğu süreyi
 * ölçüyor — kullanıcı ekranı açık bırakıp kahve içmiş olabilir.
 * Ölçmediğimiz bir şeyi kaydetmek, veriyi yalancı yapar.
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
