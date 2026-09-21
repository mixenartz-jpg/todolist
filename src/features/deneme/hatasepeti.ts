/**
 * Hata sepeti — yanlışların TÜRÜNE göre dağılımı ve reçetesi.
 *
 * ── Neden bu modül var? ──
 * Toplam net "ne kadar iyiyim" der, "neyi yanlış yapıyorum" demez.
 * Alan araştırmasının en tekrar eden bulgusu şuydu: uygulamaların
 * çoğu zayıf konu listesi gösterip orada duruyor, koç hissi veren
 * şey ise analizin EYLEME dönüşmesi. Buradaki beş kova tam olarak
 * bunun için seçildi — her birinin karşılığı farklı bir çalışma
 * biçimi, dolayısıyla dağılım doğrudan bir reçete üretiyor.
 */

/** Hata türleri — veritabanındaki `hata_turu` kısıtıyla birebir. */
export type HataTuru = "bilgi" | "islem" | "dikkat" | "sure" | "strateji";

/** Kovaların ekrandaki sırası ve adları. */
export const HATA_TURLERI: readonly {
  tur: HataTuru;
  ad: string;
  /** Bu kova baskınsa yapılacak iş. */
  recete: string;
}[] = [
  {
    tur: "bilgi",
    ad: "Bilgi eksiği",
    recete: "Konuya dön, baştan çalış. Deneme çözmeyi azalt.",
  },
  {
    tur: "islem",
    ad: "İşlem hatası",
    recete: "Adım adım yaz, ara sonucu kontrol et. Küçük setler çöz.",
  },
  {
    tur: "dikkat",
    ad: "Dikkat hatası",
    recete: "Soru kökünün altını çiz. Ne sorulduğunu tekrar oku.",
  },
  {
    tur: "sure",
    ad: "Süre yetmedi",
    recete: "Süreli set çöz: 10 soru 10 dakika. Hız antrenmanı.",
  },
  {
    tur: "strateji",
    ad: "Strateji hatası",
    recete: "Atlama kuralı koy: 90 saniyede çıkmıyorsa geç.",
  },
];

/** Bir kovanın sayımı. */
export interface HataKovasi {
  tur: HataTuru;
  ad: string;
  recete: string;
  adet: number;
  /** Etiketli yanlışlar içindeki payı (0..1). */
  oran: number;
}

export interface HataSepeti {
  kovalar: readonly HataKovasi[];
  /** Etiketlenmiş yanlış sayısı. */
  etiketli: number;
  /** Henüz etiketlenmemiş yanlış sayısı. */
  etiketsiz: number;
  /**
   * En baskın kova — reçetenin kaynağı.
   *
   * `null` olabilir: hiç etiketli yanlış yoksa ya da tepede
   * BERABERLİK varsa. Beraberlikte kova seçmek, iki eşit sinyalden
   * birini keyfî olarak "asıl sorunun" ilan etmek olurdu.
   */
  baskin: HataKovasi | null;
}

/** `hataSepeti` için yeterli olan en dar satır şekli. */
export interface HataTasiyan {
  hataTuru: HataTuru | null;
}

/**
 * Yanlışları türlerine göre sayar ve reçeteyi belirler.
 *
 * ── Neden etiketsizler AYRI sayılıyor? ──
 * Etiketsiz bir yanlış "hatasız" demek değil, "henüz bakmadım"
 * demektir. Oranlara katılsaydı dağılım sulanır ve dördüncü kova
 * gibi davranırdı; toplamın dışında tutulup ayrı gösterilmesi
 * kullanıcıya yapılacak işi ("14 yanlış etiketlenmeyi bekliyor")
 * doğrudan söyler.
 *
 * ── Oran neden etiketliye göre? ──
 * Payda etiketli sayısıdır. Toplam kullanılsaydı, yarısı
 * etiketlenmemiş bir denemede tüm kovalar olduğundan küçük görünür
 * ve "bilgi eksiğim %20" gibi yanlış bir okuma doğardı.
 */
export function hataSepeti(yanlislar: readonly HataTasiyan[]): HataSepeti {
  const sayim = new Map<HataTuru, number>();
  let etiketsiz = 0;

  for (const y of yanlislar) {
    if (y.hataTuru === null) {
      etiketsiz++;
      continue;
    }
    sayim.set(y.hataTuru, (sayim.get(y.hataTuru) ?? 0) + 1);
  }

  const etiketli = yanlislar.length - etiketsiz;

  const kovalar = HATA_TURLERI.map(({ tur, ad, recete }) => {
    const adet = sayim.get(tur) ?? 0;
    return {
      tur,
      ad,
      recete,
      adet,
      // Etiketli yoksa 0: burada `null` DEĞİL, çünkü kova gerçekten
      // boş ve "0 yanlış" doğru bir ifade. `yanlisBosOrani`'ndaki
      // null ise "ölçülecek davranış yok" demekti — farklı durum.
      oran: etiketli === 0 ? 0 : adet / etiketli,
    };
  });

  return { kovalar, etiketli, etiketsiz, baskin: baskinKova(kovalar) };
}

/**
 * En çok yanlışın düştüğü kova.
 *
 * Beraberlikte `null`: iki kova eşitse hangisinin "asıl sorun"
 * olduğunu söylemek veriye dayanmayan bir iddia olurdu. Ekran o
 * durumda reçete yerine "dağılım dengeli" der.
 */
function baskinKova(kovalar: readonly HataKovasi[]): HataKovasi | null {
  let enIyi: HataKovasi | null = null;
  let beraberlik = false;

  for (const k of kovalar) {
    if (k.adet === 0) continue;

    if (enIyi === null || k.adet > enIyi.adet) {
      enIyi = k;
      beraberlik = false;
    } else if (k.adet === enIyi.adet) {
      beraberlik = true;
    }
  }

  return beraberlik ? null : enIyi;
}
