/**
 * Net ve sayı biçimlendirme — ekranda görünen her netin tek geçtiği yer.
 *
 * Neden ayrı modül: net dört ayrı yüzeyde çiziliyor (liste satırı,
 * detay başlığı, ders tablosu, trend ipucu). Her birinin kendi
 * `toFixed(2)` çağrısı olsaydı, "0.25 katı" kuralının ekrandaki
 * karşılığı dört yerde ayrı ayrı bozulabilirdi.
 */

/**
 * Net metni: her zaman iki ondalık, virgüllü.
 *
 * ── Neden iki ondalık, gereksiz sıfırlar atılmıyor? ──
 * Net her zaman 0.25'in katı (bkz. `NET_ADIMI`) yani ondalık kısmı
 * yalnızca .00, .25, .50, .75 olabilir. Sıfırlar atılsaydı sütun
 * hizası bozulurdu: "86" ile "85,75" alt alta geldiğinde göz
 * karşılaştıramaz. `tabular` sınıfı genişliği zaten sabitliyor;
 * ondalık sayısını da sabitlemek işi tamamlıyor.
 *
 * ── Virgül, nokta değil ──
 * Türkçede ondalık ayırıcı virgüldür. `toLocaleString("tr-TR")`
 * bunu yapar ama binlik ayırıcı da ekler — netler 120'yi geçmediği
 * için bu fark etmez, yine de niyeti açık tutmak adına elle
 * değiştiriliyor.
 */
export function formatNet(net: number): string {
  return net.toFixed(2).replace(".", ",");
}

/**
 * İşaretli değişim metni: "+3,25" / "−1,50".
 *
 * Artı işareti AÇIKÇA yazılır: "3,25" tek başına bir değişim değil
 * bir değer gibi okunur. Eksi işareti tipografik eksi (U+2212), ASCII
 * tire değil — tirenin rakam yüksekliğinde olmaması sayıyı yamuk
 * gösterir.
 *
 * Sıfır değişimde işaret YOK: "+0,00" ilerleme varmış gibi durur.
 */
export function formatNetDegisim(degisim: number): string {
  if (degisim === 0) return formatNet(0);

  const isaret = degisim > 0 ? "+" : "−";
  return `${isaret}${formatNet(Math.abs(degisim))}`;
}

/** Süre metni: "135 dk" → saat geçerse "2 sa 15 dk". */
export function formatSure(dakika: number): string {
  if (dakika < 60) return `${dakika} dk`;

  const saat = Math.floor(dakika / 60);
  const kalan = dakika % 60;
  return kalan === 0 ? `${saat} sa` : `${saat} sa ${kalan} dk`;
}

/**
 * Yüzde metni — hata dağılımı ve yanlış/boş oranı için.
 *
 * Ondalıksız: "%23,4 dikkat hatası" sahte bir kesinlik verir. Elli
 * yanlışın on ikisi dikkat hatasıysa doğru ifade "%24".
 */
export function formatOran(oran: number): string {
  return `%${Math.round(oran * 100)}`;
}

/**
 * Metin girdisini tam sayıya çevirir — üç durumlu sözleşme.
 *
 * `goal.ts`'in `parseTargetCount` deseniyle BİREBİR aynı ve bilerek:
 *   · `null`      → alan boş, bu MEŞRU (henüz girilmedi)
 *   · `undefined` → bozuk girdi, form kaydetmemeli
 *   · `number`    → geçerli
 *
 * İki durumlu olsaydı ("sayı ya da null") boş alan ile "abc" yazılmış
 * alan aynı şeye düşerdi ve form ikincisini sessizce boş sayardı.
 */
export function parseSayi(text: string, max: number): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return null;

  // `Number` boşluk ve ondalık kabul eder; burada YALNIZCA rakam
  // isteniyor. "12.5 doğru" diye bir şey yok.
  if (!/^\d+$/.test(trimmed)) return undefined;

  const value = Number(trimmed);
  return value <= max ? value : undefined;
}
