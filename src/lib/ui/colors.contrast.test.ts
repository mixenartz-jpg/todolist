import { describe, expect, test } from "vitest";
import { SLOT_HEX, SLOT_COUNT, SLOT_NAMES } from "./colors";

/*
 * Renk sisteminin KAPISI.
 *
 * `colors.ts` ve `globals.css` "dataviz validator'ından geçirildi"
 * diyor ama bu bir YORUMDU: yüzey rengi #111318'den #101010'a
 * indiğinde hiçbir şey uyarmadı, kimse yeniden doğrulamadı. Bu dosya
 * o iddiayı çalıştırılabilir bir kontrole çevirir.
 *
 * Mevcut vitest yapılandırmasına birebir uyar: saf mantık, DOM yok,
 * node ortamı (`vitest.config.mts` → `src/**\/*.test.ts`).
 */

/** `globals.css` ile AYNI değerler. Değişirse burası da değişmeli. */
const SURFACE_L = 0.175; // --color-surface: oklch(0.175 0.008 48)
const BG_L = 0.135; // --color-bg
const SURFACE_3_L = 0.25; // --color-surface-3

/*
 * Yüzey rampası artık kroma TAŞIYOR (0.008–0.010, hue 48 — vurgunun
 * kendi hue'su). Kroma bu kadar düşükken parlanıklığa etkisi
 * ölçülebilir ama küçüktür; `luminanceFromOklchL` (chroma-0 kestirmesi)
 * yüzey testleri için hâlâ yeterince doğru ve kontrolleri DAHA SIKI
 * tarafta tutar.
 *
 * Vurgu (kroma 0.19) için bu kestirme geçersiz: tam OKLCH → sRGB
 * dönüşümü gerekir ve aşağıda `oklchToSrgb` onu yapıyor.
 */

/** `globals.css` vurgu rampası. */
const ACCENT = { L: 0.7, C: 0.19, H: 48 };
const ACCENT_HOVER = { L: 0.755, C: 0.185, H: 48 };
const ON_ACCENT = { L: 0.145, C: 0.02, H: 48 };
const WARN = { L: 0.85, C: 0.16, H: 95 };

const INK = { name: "ink", L: 0.965 };
const INK_2 = { name: "ink-2", L: 0.78 };
const INK_3 = { name: "ink-3", L: 0.605 };

/** Yoğunluk rampası — `globals.css` `--color-level-*` açıklıkları. */
const LEVEL_L = [0.215, 0.4, 0.53, 0.66, 0.8];

/**
 * sRGB hex → bağıl parlaklık (WCAG 2.1 tanımı).
 */
function relativeLuminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const [r, g, b] = channels as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * OKLCH açıklığı (chroma 0) → bağıl parlaklık.
 *
 * Kroma sıfır olduğu için renk saf gridir ve OKLab'ın ters dönüşümü
 * tek boyuta iner: L_oklch³ doğrusal sRGB değerini verir, gri olduğu
 * için üç kanal da aynıdır ve ağırlıklı toplam yine o değerdir.
 */
function luminanceFromOklchL(L: number): number {
  return L ** 3;
}

/**
 * Tam OKLCH → doğrusal sRGB → bağıl parlaklık.
 *
 * `luminanceFromOklchL` yalnızca kroma 0 için doğrudur. Vurgu
 * rampası 0.19 kroma taşıyor ve orada kestirme kullanmak kontrast
 * iddiasını UYDURMAK olurdu.
 */
function luminanceFromOklch({
  L,
  C,
  H,
}: {
  L: number;
  C: number;
  H: number;
}): number {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  // OKLab → LMS (küp kökün tersi)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  // LMS → doğrusal sRGB
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return 0.2126 * clamp(r) + 0.7152 * clamp(g) + 0.0722 * clamp(bl);
}

/** WCAG kontrast oranı. */
function contrast(l1: number, l2: number): number {
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

describe("rutin kimlik renkleri (slot)", () => {
  test("sekiz slot ve sekiz ad vardır", () => {
    expect(SLOT_HEX).toHaveLength(SLOT_COUNT);
    expect(SLOT_NAMES).toHaveLength(SLOT_COUNT);
  });

  /*
   * Yüzey #111318 → #101010'a KOYULAŞTI. Sabit bir ön plan için
   * kontrast oranı daha koyu zeminde monoton olarak ARTAR, yani bu
   * kontrolün geçmesi bekleniyor — ama artık VARSAYIM değil, ölçüm.
   */
  test.each(SLOT_HEX.map((hex, i) => [i, hex, SLOT_NAMES[i]] as const))(
    "slot %i (%s / %s) yüzeye karşı en az 3:1 kontrast taşır",
    (_i, hex) => {
      const ratio = contrast(
        relativeLuminance(hex),
        luminanceFromOklchL(SURFACE_L),
      );
      expect(ratio).toBeGreaterThanOrEqual(3);
    },
  );

  test("hiçbir slot bir diğeriyle aynı değildir", () => {
    expect(new Set(SLOT_HEX).size).toBe(SLOT_COUNT);
  });

  /*
   * Slot SIRASI renk körlüğü güvenliğinin mekanizmasıdır (README).
   * Bu test sırayı DONDURUR: bir slotu "daha güzel" diye taşımak
   * kırmızıya döner ve gerekçeyi okumaya zorlar.
   */
  test("slot sırası donduruldu — değiştirmek renk körlüğü güvenliğini bozar", () => {
    expect(SLOT_HEX).toEqual([
      "#3987e5",
      "#d95926",
      "#199e70",
      "#c98500",
      "#d55181",
      "#008300",
      "#9085e9",
      "#e66767",
    ]);
  });
});

describe("yoğunluk rampası (level)", () => {
  test("beş kademe vardır", () => {
    expect(LEVEL_L).toHaveLength(5);
  });

  test("açıklık monoton artar", () => {
    for (let i = 1; i < LEVEL_L.length; i++) {
      expect(LEVEL_L[i]!).toBeGreaterThan(LEVEL_L[i - 1]!);
    }
  });

  /*
   * Komşu kademeler görünür şekilde ayrışmalı: ısı haritası 10-11px
   * hücrelerde okunuyor ve orada küçük bir fark tamamen kaybolur.
   */
  test("komşu kademeler en az 0.10 açıklık farkıyla ayrışır", () => {
    for (let i = 1; i < LEVEL_L.length; i++) {
      expect(LEVEL_L[i]! - LEVEL_L[i - 1]!).toBeGreaterThanOrEqual(0.1);
    }
  });

  /*
   * `level-0` "veri yok"tur, bir kademe değil. Nötr olmalı ve
   * yüzeyden ayrılabilmeli — eski #171b24 mavimsi yüzeyin üstünde
   * durmak için seçilmişti ve nötr zeminde mavi bir leke oluyordu.
   */
  test("level-0 yüzeyden ayrışır ama mürekkep değildir", () => {
    expect(LEVEL_L[0]!).toBeGreaterThan(SURFACE_L);
    expect(LEVEL_L[0]!).toBeLessThan(INK_3.L);
  });

  /*
   * `MatrixScoreRow` ve `CalendarDayCell` kademe ≥3'te metni
   * `--color-on-accent`e (koyu) çeviriyor. Bu eşiğin doğru yerde
   * olduğunu ölçer: 3 ve 4 koyu metin taşıyacak kadar açık olmalı.
   */
  test("kademe 3 ve 4 koyu metin taşıyacak kadar açıktır", () => {
    for (const level of [3, 4]) {
      const ratio = contrast(
        luminanceFromOklchL(LEVEL_L[level]!),
        luminanceFromOklchL(0.14), // --color-on-accent
      );
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("mürekkep rampası", () => {
  test.each([
    [INK, "bg", BG_L, 4.5],
    [INK, "surface", SURFACE_L, 4.5],
    [INK_2, "bg", BG_L, 4.5],
    [INK_2, "surface", SURFACE_L, 4.5],
    [INK_3, "bg", BG_L, 4.5],
    [INK_3, "surface", SURFACE_L, 4.5],
  ] as const)(
    "%s zemine (%s) karşı AA gövde metni eşiğini geçer",
    (ink, _surfaceName, surfaceL, min) => {
      const ratio = contrast(
        luminanceFromOklchL(ink.L),
        luminanceFromOklchL(surfaceL),
      );
      expect(ratio).toBeGreaterThanOrEqual(min);
    },
  );

  /*
   * `globals.css`'te yazılı KURAL: `ink-3` surface-3 ÜZERİNDE metin
   * için kullanılmaz. Bu test o kuralın hâlâ gerekli olduğunu
   * kanıtlar — geçerse kural yazıda kalmalı, kalkarsa kural
   * gereksizleşmiş demektir ve yorum güncellenmeli.
   */
  test("ink-3 surface-3 üzerinde AA'yı geçemez (kuralın gerekçesi)", () => {
    const ratio = contrast(
      luminanceFromOklchL(INK_3.L),
      luminanceFromOklchL(SURFACE_3_L),
    );
    expect(ratio).toBeLessThan(4.5);
  });

  test("mürekkep rampası monoton koyulaşır", () => {
    expect(INK.L).toBeGreaterThan(INK_2.L);
    expect(INK_2.L).toBeGreaterThan(INK_3.L);
  });
});

describe("yüzey rampası", () => {
  test("nötr siyah rampa monoton açılır", () => {
    expect(SURFACE_L).toBeGreaterThan(BG_L);
    expect(SURFACE_3_L).toBeGreaterThan(SURFACE_L);
  });
});

/*
 * VURGU RAMPASI — turuncu.
 *
 * Palet monokromdan (accent = ink) turuncuya döndü. Monokromken
 * kontrast sorusu yoktu: vurgu zaten mürekkebin kendisiydi. Turuncu
 * kendi parlaklığını getiriyor ve her iddia ölçülmeli.
 *
 * `globals.css`'teki yorumlarda yazılı sayılar BURADAN geliyor;
 * değerler değişirse bu testler kırmızıya döner ve yorumlar da
 * güncellenmek zorunda kalır.
 */
describe("vurgu rampası (turuncu)", () => {
  const bgLum = luminanceFromOklchL(BG_L);
  const surfaceLum = luminanceFromOklchL(SURFACE_L);

  test("vurgu zemine karşı en az 3:1 taşır (büyük metin, ikon)", () => {
    expect(contrast(luminanceFromOklch(ACCENT), bgLum)).toBeGreaterThanOrEqual(
      3,
    );
  });

  test("vurgu yüzeye karşı en az 3:1 taşır", () => {
    expect(
      contrast(luminanceFromOklch(ACCENT), surfaceLum),
    ).toBeGreaterThanOrEqual(3);
  });

  /*
   * EN KRİTİK KONTROL. Birincil düğmenin dolgusu vurgu, METNİ
   * `on-accent`. Bu oran 4.5'in altına düşerse düğme yazısı
   * okunmaz olur ve bunu hiçbir derleme hatası söylemez.
   *
   * Beyaz metin burada YETMEZ: L=0.70 turuncu üstünde beyaz yalnızca
   * ~2.9:1 verir. `on-accent`'in koyu olmasının sebebi bu.
   */
  test("dolgu üstündeki metin (on-accent) en az 4.5:1 taşır", () => {
    expect(
      contrast(luminanceFromOklch(ON_ACCENT), luminanceFromOklch(ACCENT)),
    ).toBeGreaterThanOrEqual(4.5);
  });

  test("hover dolgusunda da metin en az 4.5:1 taşır", () => {
    expect(
      contrast(luminanceFromOklch(ON_ACCENT), luminanceFromOklch(ACCENT_HOVER)),
    ).toBeGreaterThanOrEqual(4.5);
  });

  /*
   * `warn` ile `accent` AYRIŞMALI.
   *
   * İkisi de sıcak renkler ve eski `warn` (hue 82) turuncu-sarıydı:
   * vurgu turuncuya dönünce "uyarı" ile "birincil eylem" aynı
   * sıcaklıkta okunuyordu. Hue farkı bu ayrımın mekanizmasıdır ve
   * bu test onu dondurur.
   */
  test("uyarı rengi vurgudan en az 40 derece hue uzaklıkta durur", () => {
    expect(Math.abs(WARN.H - ACCENT.H)).toBeGreaterThanOrEqual(40);
  });

  test("uyarı rengi zemine karşı en az 3:1 taşır", () => {
    expect(contrast(luminanceFromOklch(WARN), bgLum)).toBeGreaterThanOrEqual(3);
  });
});
