/**
 * Net hesabı — YKS'nin tek aritmetik kuralı.
 *
 * ── Neden burada, veritabanında DEĞİL? ──
 * Net tamamen türetilmiş bir değerdir ve sütun olarak saklanmaz
 * (gerekçe migration 0018'de). Türetme tek yerde olmalı; iki yerde
 * olsaydı (SQL view + TypeScript) ikisi ayrışabilirdi ve hangisinin
 * doğru olduğu belirsizleşirdi. Saf fonksiyon test edilebilir,
 * `generated column` edilemez.
 */

/** Her yanlış bu kadar net götürür. */
const YANLIS_CEZASI = 4;

/**
 * Netin adım büyüklüğü — sonuç her zaman bunun katıdır.
 *
 * Ekranda ve testte bir değişmez olarak kullanılır: 0.25'in katı
 * olmayan bir net, hesaba yanlış bir sayı girdiğimizin işaretidir.
 */
export const NET_ADIMI = 0.25;

/**
 * Tek dersin neti: `doğru − yanlış / 4`.
 *
 * ── Boş neden hesaba GİRMİYOR? ──
 * ÖSYM boş cevabı cezalandırmaz. Cezalandıran bir hesap, "emin
 * değilsem boş bırakayım" stratejisini yanlış biçimde cezalandırır
 * ve öğrenciyi rastgele işaretlemeye iterdi.
 *
 * ── Sonuç neden SIFIRA KIRPILMIYOR? ──
 * Net negatif olabilir ve ÖSYM de kırpmaz. Kırpmak, kötü giden iki
 * denemeyi ekranda aynı gösterir ve düşüşü gizlerdi — koçluk
 * uygulamasında en son isteyeceğimiz şey.
 */
export function hesaplaNet(dogru: number, yanlis: number): number {
  return dogru - yanlis / YANLIS_CEZASI;
}

/** `hesaplaNet` için yeterli olan en dar ders şekli. */
export interface NetGirdisi {
  dogru: number;
  yanlis: number;
}

/**
 * Denemenin toplam neti — ders netlerinin toplamı.
 *
 * Boş listede 0 döner, null değil: ders satırı olmayan bir deneme
 * "0 net yapılmış" demek değil "henüz doldurulmamış" demektir ve o
 * ayrımı ekran kendi yapar (bkz. DenemeDetay boş durumu).
 */
export function toplamNet(dersler: readonly NetGirdisi[]): number {
  return dersler.reduce((sum, d) => sum + hesaplaNet(d.dogru, d.yanlis), 0);
}

/** Bir dersin cevap dağılımı. */
export interface Dagilim {
  dogru: number;
  yanlis: number;
  bos: number;
  soruSayisi: number;
}

/**
 * Dağılım tutarlı mı: `doğru + yanlış + boş === soru sayısı`.
 *
 * Veri giriş hatalarının çoğunu bedavaya yakalar. Veritabanında da
 * aynı kısıt var (0018 `deneme_ders_toplam`) ama oraya varmadan
 * yakalamak gerekiyor: sunucu hatası kullanıcıya "satır 3 kısıtı
 * ihlal etti" diye döner, burada ise hangi alanın yanlış olduğunu
 * söyleyebiliriz.
 */
export function dagilimGecerli({ dogru, yanlis, bos, soruSayisi }: Dagilim): boolean {
  const hepsiSayi = [dogru, yanlis, bos, soruSayisi].every(
    (n) => Number.isInteger(n) && n >= 0,
  );
  if (!hepsiSayi) return false;

  return dogru + yanlis + bos === soruSayisi;
}

/**
 * Üçüncü alanı türetir: boş = soru sayısı − doğru − yanlış.
 *
 * Girişin hızlı olmasının dayanağı. Alan araştırmasının en net
 * bulgusu şuydu: deneme kaydı angarya olursa uygulama üçüncü haftada
 * ölür. Kullanıcı iki sayı yazar, üçüncüsü kendiliğinden dolar.
 *
 * Taşma ya da negatif girdide `null` döner — 0 DEĞİL. Sıfır geçerli
 * bir boş sayısıdır ve hatayı "hepsini cevapladı" gibi gösterirdi.
 */
export function kalanBos(
  dogru: number,
  yanlis: number,
  soruSayisi: number,
): number | null {
  const gecerli = [dogru, yanlis, soruSayisi].every(
    (n) => Number.isInteger(n) && n >= 0,
  );
  if (!gecerli) return null;

  const bos = soruSayisi - dogru - yanlis;
  return bos >= 0 ? bos : null;
}

/**
 * Yanlış/boş oranı: `yanlış / (yanlış + boş)`.
 *
 * ── Neden bu sayı önemli? ──
 * Toplam net "ne kadar iyiyim" der ama "neyi yanlış yapıyorum"
 * demez. Bu oran sınav DAVRANIŞINI teşhis eder:
 *   yüksek (→1) : emin olmadığında işaretliyorsun — boş bırakmalıydın
 *   düşük  (→0) : bildiğin soruyu da boş bırakıyorsun — çekingensin
 *
 * Alan araştırmasında tekrar tekrar "sadece nete bakmak" birinci
 * hata olarak geçiyor; bu oran ise tüketici uygulamalarında
 * neredeyse hiç hesaplanmıyor.
 *
 * ── Neden `null`, 0 DEĞİL? ──
 * Yanlış ve boşun ikisi de sıfırsa ölçülecek bir davranış YOKTUR
 * (kusursuz deneme). 0 dönseydi "aşırı çekingen" ucunda görünürdü.
 * `goalProgress`'in `ratio: null` kararıyla aynı aile: ölçü yoksa
 * sayı uydurulmaz, ekran "ölçülmüyor" der.
 */
export function yanlisBosOrani(yanlis: number, bos: number): number | null {
  const cevaplanmayanVeYanlis = yanlis + bos;
  if (cevaplanmayanVeYanlis === 0) return null;

  return yanlis / cevaplanmayanVeYanlis;
}
