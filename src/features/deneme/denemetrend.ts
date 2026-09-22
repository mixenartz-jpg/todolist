import type { DateStr } from "@/lib/date/types";
import { toplamNet, type NetGirdisi } from "./net";
import type { DenemeTur } from "./sinav";

/**
 * Deneme net trendi — "yükseliyor muyum?" sorusunun cevabı.
 *
 * ── Neden `stats/trend.ts`'ten AYRI? ──
 * O modül rutin tamamlama oranının haftalık eğilimini ölçüyor; birimi
 * yüzde, ekseni hafta. Buranın birimi net, ekseni deneme. Ortak bir
 * "trend" soyutlaması ikisini de bozardı: rutinde eksik hafta sıfırdır
 * (o hafta hiç işaretlenmemiş), denemede eksik hafta HİÇBİR ŞEY
 * değildir (o hafta deneme çözülmemiş — sıfır net yapılmış demek
 * değil). Aynı kelimenin iki farklı anlamı.
 */

/** Trend çizgisindeki tek nokta. */
export interface NetNoktasi {
  denemeId: string;
  ad: string;
  tarih: DateStr;
  net: number;
}

/** `netSerisi` için yeterli olan en dar deneme şekli. */
export interface TrendGirdisi {
  id: string;
  ad: string;
  tarih: DateStr;
  tur: DenemeTur;
  dersler: readonly NetGirdisi[];
}

/**
 * Trend serileri — tür ailesine göre AYRI.
 *
 * ── Neden ayrılmak ZORUNDA? ──
 * Bir TYT denemesinin tavanı 120 net, bir branş denemesinin 40. Aynı
 * çizgide ortalanırsalar branş günü grafikte bir ÇÖKÜŞ gibi görünür —
 * halbuki öğrenci sadece kısa bir test çözmüştür. Bu, alan
 * araştırmasının işaret ettiği gerçek bir doğruluk hatası ve
 * uygulamaların sıkça düştüğü tuzak.
 *
 * Ayrım TÜR bazında, alan bazında değil: AYT-SAY ile AYT-EA'nın
 * ikisi de 80 soruluk ve aynı eksende karşılaştırılabilir. Alan
 * değiştirmek zaten nadir bir olay ve olduğunda trendin kırılması
 * doğru bir sinyal.
 */
export interface NetTrendi {
  tyt: NetNoktasi[];
  ayt: NetNoktasi[];
  brans: NetNoktasi[];
  ydt: NetNoktasi[];
}

/**
 * Denemeleri türlerine göre ayırıp her biri için net serisi üretir.
 *
 * Noktalar TARİHE GÖRE ARTAN sıralanır — liste ekranı en yeniyi üstte
 * gösterir ama bir grafik soldan sağa zaman akar. Sıralamayı çağırana
 * bırakmak, listeden gelen diziyi doğrudan geçiren bir çağrıda
 * grafiği ters çizerdi.
 */
export function netSerisi(denemeler: readonly TrendGirdisi[]): NetTrendi {
  const trend: NetTrendi = { tyt: [], ayt: [], brans: [], ydt: [] };

  for (const d of denemeler) {
    trend[d.tur].push({
      denemeId: d.id,
      ad: d.ad,
      tarih: d.tarih,
      net: toplamNet(d.dersler),
    });
  }

  for (const tur of Object.keys(trend) as DenemeTur[]) {
    const seri = trend[tur];
    /*
     * Tarih eşitliğinde sıra KORUNUR (`sort` kararlı): aynı gün iki
     * deneme çözüldüğünde gelen sıra sorgunun sırasıdır ve onu
     * bozmak, grafikte iki noktanın her yüklemede yer değiştirmesi
     * demekti.
     */
    seri.sort((a, b) => (a.tarih < b.tarih ? -1 : a.tarih > b.tarih ? 1 : 0));
  }

  return trend;
}

/** Bir serinin özeti — kart başlığında gösterilen sayılar. */
export interface SeriOzeti {
  /** Serideki deneme sayısı. */
  adet: number;
  sonNet: number;
  enIyiNet: number;
  ortalamaNet: number;
  /**
   * Son net ile ONDAN ÖNCEKİ arasındaki fark.
   *
   * `null` olabilir: tek denemelik seride karşılaştırılacak bir şey
   * yoktur. 0 dönseydi "değişim yok" derdi — halbuki ölçüm yok.
   * `yanlisBosOrani`'nın null kararıyla aynı aile.
   */
  degisim: number | null;
}

/**
 * Serinin özeti. Boş seride `null` — gösterilecek bir şey yok.
 *
 * Ortalama neden ağırlıksız? Her deneme bir gözlem; yakın tarihli
 * olana ağırlık vermek (hareketli ortalama) daha "akıllı" görünürdü
 * ama kullanıcının kafasında "ortalamam kaç" sorusunun cevabı basit
 * aritmetik ortalamadır. Ekranda gösterilen sayı, kullanıcının elle
 * doğrulayabildiği sayı olmalı.
 */
export function seriOzeti(seri: readonly NetNoktasi[]): SeriOzeti | null {
  if (seri.length === 0) return null;

  const netler = seri.map((n) => n.net);
  const sonNet = netler[netler.length - 1];

  return {
    adet: seri.length,
    sonNet,
    enIyiNet: Math.max(...netler),
    ortalamaNet: netler.reduce((a, b) => a + b, 0) / netler.length,
    degisim: netler.length < 2 ? null : sonNet - netler[netler.length - 2],
  };
}

/** Grafikte çizilecek, en az iki noktası olan seriler. */
export interface CizilebilirSeri {
  tur: DenemeTur;
  ad: string;
  noktalar: NetNoktasi[];
}

const TUR_ADI: Record<DenemeTur, string> = {
  tyt: "TYT",
  ayt: "AYT",
  brans: "Branş",
  ydt: "YDT",
};

/**
 * Çizilmeye değer seriler — en az İKİ noktalı olanlar.
 *
 * Tek noktalı bir seri çizgi grafikte bir çizgi değil, havada duran
 * bir nokta olurdu ve "trend" iddiası taşıyamaz. O denemenin neti
 * listede zaten görünüyor; grafikte tekrar etmek yer kaplamaktan
 * başka bir şey yapmaz.
 */
export function cizilebilirSeriler(trend: NetTrendi): CizilebilirSeri[] {
  return (Object.keys(TUR_ADI) as DenemeTur[])
    .map((tur) => ({ tur, ad: TUR_ADI[tur], noktalar: trend[tur] }))
    .filter((s) => s.noktalar.length >= 2);
}
