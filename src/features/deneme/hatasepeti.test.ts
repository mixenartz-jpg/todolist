import { describe, expect, it } from "vitest";
import { HATA_TURLERI, type HataTasiyan, hataSepeti } from "./hatasepeti";

const y = (hataTuru: HataTasiyan["hataTuru"]): HataTasiyan => ({ hataTuru });

describe("hataSepeti", () => {
  it("türlere göre sayar", () => {
    const sepet = hataSepeti([y("bilgi"), y("bilgi"), y("dikkat")]);

    const bilgi = sepet.kovalar.find((k) => k.tur === "bilgi");
    const dikkat = sepet.kovalar.find((k) => k.tur === "dikkat");

    expect(bilgi?.adet).toBe(2);
    expect(dikkat?.adet).toBe(1);
    expect(sepet.etiketli).toBe(3);
  });

  it("beş kovanın hepsini HER ZAMAN döner — boş olanlar dahil", () => {
    /*
     * Boş kovayı gizlemek, "bu hatayı hiç yapmıyorum" bilgisini de
     * gizlerdi. Ayrıca ekranda kova sayısı denemeden denemeye
     * değişir ve dağılım grafiği zıplardı.
     */
    const sepet = hataSepeti([y("bilgi")]);
    expect(sepet.kovalar).toHaveLength(HATA_TURLERI.length);
    expect(sepet.kovalar.filter((k) => k.adet === 0)).toHaveLength(4);
  });

  it("etiketsizleri AYRI sayar, orana katmaz", () => {
    /*
     * Etiketsiz "hatasız" değil "henüz bakmadım" demek. Oranlara
     * katılsaydı dağılım sulanır ve altıncı kova gibi davranırdı.
     */
    const sepet = hataSepeti([y("bilgi"), y(null), y(null)]);

    expect(sepet.etiketsiz).toBe(2);
    expect(sepet.etiketli).toBe(1);

    const bilgi = sepet.kovalar.find((k) => k.tur === "bilgi");
    // Payda 1 (etiketli), 3 değil.
    expect(bilgi?.oran).toBe(1);
  });

  it("oranların toplamı 1 eder", () => {
    const sepet = hataSepeti([y("bilgi"), y("bilgi"), y("sure"), y("dikkat")]);
    const toplam = sepet.kovalar.reduce((s, k) => s + k.oran, 0);
    expect(toplam).toBeCloseTo(1);
  });

  it("baskın kova reçeteyi taşır", () => {
    const sepet = hataSepeti([y("bilgi"), y("bilgi"), y("bilgi"), y("dikkat")]);

    expect(sepet.baskin?.tur).toBe("bilgi");
    expect(sepet.baskin?.recete).toContain("Konuya dön");
  });

  it("tepede BERABERLİK varsa baskın YOK", () => {
    /*
     * İki eşit sinyalden birini keyfî olarak "asıl sorun" ilan etmek
     * veriye dayanmayan bir iddia olurdu. Ekran o durumda reçete
     * yerine "dağılım dengeli" der.
     */
    const sepet = hataSepeti([y("bilgi"), y("dikkat")]);
    expect(sepet.baskin).toBeNull();
  });

  it("hiç etiketli yoksa baskın YOK ve oranlar 0", () => {
    const sepet = hataSepeti([y(null), y(null)]);

    expect(sepet.baskin).toBeNull();
    expect(sepet.etiketli).toBe(0);
    expect(sepet.kovalar.every((k) => k.oran === 0)).toBe(true);
  });

  it("boş listede çökmez", () => {
    const sepet = hataSepeti([]);

    expect(sepet.etiketli).toBe(0);
    expect(sepet.etiketsiz).toBe(0);
    expect(sepet.baskin).toBeNull();
  });

  it("kova sırası sabit — grafik zıplamaz", () => {
    const a = hataSepeti([y("sure")]);
    const b = hataSepeti([y("bilgi")]);
    expect(a.kovalar.map((k) => k.tur)).toEqual(b.kovalar.map((k) => k.tur));
  });
});

describe("HATA_TURLERI", () => {
  it("her türün eyleme dönük bir reçetesi var", () => {
    // Reçetesiz bir kova, kullanıcıya "şunu yanlış yapıyorsun" deyip
    // ne yapacağını söylememek olurdu — tam da kaçındığımız şey.
    for (const t of HATA_TURLERI) {
      expect(t.recete.length).toBeGreaterThan(10);
      expect(t.ad.length).toBeGreaterThan(0);
    }
  });

  it("beş kova var ve hepsi benzersiz", () => {
    const turler = HATA_TURLERI.map((t) => t.tur);
    expect(turler).toHaveLength(5);
    expect(new Set(turler).size).toBe(5);
  });
});
