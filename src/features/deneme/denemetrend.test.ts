import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import {
  cizilebilirSeriler,
  netSerisi,
  seriOzeti,
  type TrendGirdisi,
} from "./denemetrend";
import type { DenemeTur } from "./sinav";

/*
 * Net trendinin testleri.
 *
 * En önemli madde ilk sırada: TÜRLER AYRI ÇİZİLİR. Bu bir üslup
 * tercihi değil, doğruluk meselesi — 120 soruluk TYT ile 40 soruluk
 * branş aynı eksende ortalanırsa branş günü grafikte çöküş gibi
 * görünür ve kullanıcı olmayan bir düşüşe bakar.
 */

function deneme(
  id: string,
  tarih: string,
  tur: DenemeTur,
  dersler: { dogru: number; yanlis: number }[],
): TrendGirdisi {
  return { id, ad: `${tur} ${id}`, tarih: asDateStr(tarih), tur, dersler };
}

describe("netSerisi", () => {
  it("TYT ve branşı AYRI serilere koyar — asla ortalamaz", () => {
    const trend = netSerisi([
      deneme("a", "2026-09-01", "tyt", [{ dogru: 100, yanlis: 8 }]),
      deneme("b", "2026-09-02", "brans", [{ dogru: 20, yanlis: 4 }]),
      deneme("c", "2026-09-03", "tyt", [{ dogru: 104, yanlis: 4 }]),
    ]);

    expect(trend.tyt.map((n) => n.net)).toEqual([98, 103]);
    expect(trend.brans.map((n) => n.net)).toEqual([19]);

    /*
     * Asıl korunan şey: TYT serisi YÜKSELİYOR (98 → 103) ve araya
     * giren 19 netlik branş denemesi bunu bozmuyor. Tek seri olsaydı
     * 98 → 19 → 103 diye çizilir ve ortadaki "çöküş" gerçek
     * sanılırdı.
     */
    expect(trend.tyt).toHaveLength(2);
    expect(trend.tyt.some((n) => n.net === 19)).toBe(false);
  });

  it("noktaları tarihe göre ARTAN sıralar — giriş sırası ne olursa olsun", () => {
    // Liste ekranı en yeniyi üstte verir (azalan); grafik soldan sağa
    // zaman akar. Sıralama burada yapılmazsa grafik ters çizilir.
    const trend = netSerisi([
      deneme("yeni", "2026-09-10", "tyt", [{ dogru: 80, yanlis: 0 }]),
      deneme("eski", "2026-09-01", "tyt", [{ dogru: 60, yanlis: 0 }]),
    ]);

    expect(trend.tyt.map((n) => n.denemeId)).toEqual(["eski", "yeni"]);
  });

  it("çok dersli denemenin neti ders netlerinin toplamıdır", () => {
    const trend = netSerisi([
      deneme("a", "2026-09-01", "tyt", [
        { dogru: 32, yanlis: 5 }, // 30.75
        { dogru: 28, yanlis: 8 }, // 26
        { dogru: 15, yanlis: 3 }, // 14.25
        { dogru: 16, yanlis: 2 }, // 15.5
      ]),
    ]);

    expect(trend.tyt[0].net).toBe(86.5);
  });

  it("dersi olmayan deneme 0 net verir, seriden DÜŞMEZ", () => {
    // Henüz doldurulmamış bir deneme de bir gözlemdir; grafikte
    // görünmemesi "böyle bir deneme yok" demek olurdu.
    const trend = netSerisi([deneme("bos", "2026-09-01", "tyt", [])]);

    expect(trend.tyt).toHaveLength(1);
    expect(trend.tyt[0].net).toBe(0);
  });

  it("boş girdide tüm seriler boş döner", () => {
    const trend = netSerisi([]);
    expect(trend).toEqual({ tyt: [], ayt: [], brans: [], ydt: [] });
  });
});

describe("seriOzeti", () => {
  const seri = netSerisi([
    deneme("a", "2026-09-01", "tyt", [{ dogru: 80, yanlis: 0 }]), // 80
    deneme("b", "2026-09-08", "tyt", [{ dogru: 90, yanlis: 0 }]), // 90
    deneme("c", "2026-09-15", "tyt", [{ dogru: 86, yanlis: 0 }]), // 86
  ]).tyt;

  it("son, en iyi ve ortalamayı ayırt eder", () => {
    const ozet = seriOzeti(seri);

    // Son net EN İYİ DEĞİL: ikisini karıştırmak, düşen bir seriyi
    // "rekor" diye göstermek olurdu.
    expect(ozet?.sonNet).toBe(86);
    expect(ozet?.enIyiNet).toBe(90);
    expect(ozet?.ortalamaNet).toBeCloseTo(85.333, 3);
    expect(ozet?.adet).toBe(3);
  });

  it("değişim SON İKİ denemenin farkıdır — negatif olabilir", () => {
    expect(seriOzeti(seri)?.degisim).toBe(-4);
  });

  it("tek denemelik seride değişim null — 0 DEĞİL", () => {
    /*
     * 0 "değişim yok" derdi; doğru ifade "ölçülecek değişim yok".
     * Ekran bu ayrımı görebilmeli, yoksa ilk denemesini giren
     * kullanıcıya "değişim: 0" diye anlamsız bir sayı gösterirdi.
     */
    const tek = netSerisi([
      deneme("a", "2026-09-01", "tyt", [{ dogru: 80, yanlis: 0 }]),
    ]).tyt;

    expect(seriOzeti(tek)?.degisim).toBeNull();
  });

  it("boş seride null döner", () => {
    expect(seriOzeti([])).toBeNull();
  });
});

describe("cizilebilirSeriler", () => {
  it("tek noktalı seriyi ÇİZMEZ", () => {
    // Tek nokta bir çizgi değil; "trend" iddiası taşıyamaz ve o
    // denemenin neti listede zaten görünüyor.
    const trend = netSerisi([
      deneme("a", "2026-09-01", "tyt", [{ dogru: 80, yanlis: 0 }]),
      deneme("b", "2026-09-08", "tyt", [{ dogru: 90, yanlis: 0 }]),
      deneme("c", "2026-09-02", "brans", [{ dogru: 20, yanlis: 0 }]),
    ]);

    const ciziler = cizilebilirSeriler(trend);

    expect(ciziler.map((s) => s.tur)).toEqual(["tyt"]);
    expect(ciziler[0].noktalar).toHaveLength(2);
  });

  it("hiç seri çizilemiyorsa boş dizi döner", () => {
    expect(cizilebilirSeriler(netSerisi([]))).toEqual([]);
  });
});
