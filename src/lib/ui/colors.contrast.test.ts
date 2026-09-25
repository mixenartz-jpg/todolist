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
const BG = { L: 0.19, C: 0.004, H: 255 }; // --color-bg
const SURFACE = { L: 0.245, C: 0.042, H: 255 }; // --color-surface
const SURFACE_2 = { L: 0.28, C: 0.045, H: 255 }; // --color-surface-2
const SURFACE_3 = { L: 0.315, C: 0.048, H: 255 }; // --color-surface-3
const SURFACE_L = SURFACE.L;
const BG_L = BG.L;
const SURFACE_3_L = SURFACE_3.L;

/*
 * Yüzeyler artık LACİVERT (kroma 0.042–0.048). Bu kromada chroma-0
 * kestirmesi (`luminanceFromOklchL`) parlaklığı birkaç yüzde
 * saptırıyor; yüzey kontrastları bu yüzden tam OKLCH → sRGB
 * dönüşümüyle (`luminanceFromOklch`) ölçülüyor.
 */

/** `globals.css` vurgu rampası — iki rol (bkz. globals.css). */
const ACCENT = { L: 0.76, C: 0.12, H: 245 }; // metin, çubuk, ışıma
const ACCENT_FILL = { L: 0.55, C: 0.17, H: 252 }; // düğme dolgusu
const ACCENT_HOVER = { L: 0.565, C: 0.17, H: 252 };
const ACCENT_ACTIVE = { L: 0.52, C: 0.165, H: 252 };
const ON_ACCENT = { L: 1, C: 0, H: 0 }; // beyaz
const ON_LIGHT = { L: 0.2, C: 0.03, H: 255 };
const WARN = { L: 0.78, C: 0.15, H: 60 };

const INK = { name: "ink", L: 0.965, C: 0, H: 0 };
const INK_2 = { name: "ink-2", L: 0.8, C: 0.01, H: 250 };
const INK_3 = { name: "ink-3", L: 0.66, C: 0.015, H: 250 };

/** Yoğunluk rampası — `globals.css` `--color-level-*` açıklıkları. */
const LEVEL_L = [0.3, 0.4, 0.53, 0.66, 0.8];

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
      const ratio = contrast(relativeLuminance(hex), luminanceFromOklch(SURFACE));
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
   * `MatrixScoreRow` kademe ≥3'te metni `--color-on-light`a (koyu)
   * çeviriyor. Bu eşiğin doğru yerde olduğunu ölçer: 3 ve 4 koyu metin
   * taşıyacak kadar açık olmalı.
   */
  test("kademe 3 ve 4 koyu metin taşıyacak kadar açıktır", () => {
    for (const level of [3, 4]) {
      const ratio = contrast(
        luminanceFromOklchL(LEVEL_L[level]!),
        luminanceFromOklch(ON_LIGHT),
      );
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("mürekkep rampası", () => {
  test.each([
    [INK, "bg", BG],
    [INK, "surface", SURFACE],
    [INK, "surface-2", SURFACE_2],
    [INK_2, "bg", BG],
    [INK_2, "surface", SURFACE],
    [INK_2, "surface-2", SURFACE_2],
    [INK_3, "bg", BG],
    [INK_3, "surface", SURFACE],
    [INK_3, "surface-2", SURFACE_2],
  ] as const)(
    "%s zemine (%s) karşı AA gövde metni eşiğini geçer",
    (ink, _surfaceName, surface) => {
      const ratio = contrast(luminanceFromOklch(ink), luminanceFromOklch(surface));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
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
      luminanceFromOklch(INK_3),
      luminanceFromOklch(SURFACE_3),
    );
    expect(ratio).toBeLessThan(4.5);
  });

  test("mürekkep rampası monoton koyulaşır", () => {
    expect(INK.L).toBeGreaterThan(INK_2.L);
    expect(INK_2.L).toBeGreaterThan(INK_3.L);
  });
});

describe("yüzey rampası", () => {
  test("yüzey rampası monoton açılır", () => {
    expect(SURFACE_L).toBeGreaterThan(BG_L);
    expect(SURFACE_3_L).toBeGreaterThan(SURFACE_L);
  });
});

/*
 * VURGU RAMPASI — mavi, iki rol.
 *
 * `accent` açık mavi (metin, çubuk, ışıma), `accent-fill` orta mavi
 * (düğme dolgusu, üstünde BEYAZ yazı). `globals.css`'teki yorumlarda
 * yazılı sayılar BURADAN geliyor; değerler değişirse bu testler
 * kırmızıya döner ve yorumlar da güncellenmek zorunda kalır.
 */
describe("vurgu rampası (mavi)", () => {
  const bgLum = luminanceFromOklch(BG);
  const surfaceLum = luminanceFromOklch(SURFACE);

  test("açık mavi vurgu zemine karşı gövde metni eşiğini (4.5:1) geçer", () => {
    expect(contrast(luminanceFromOklch(ACCENT), bgLum)).toBeGreaterThanOrEqual(4.5);
  });

  test("açık mavi vurgu yüzeye karşı 4.5:1 geçer", () => {
    expect(contrast(luminanceFromOklch(ACCENT), surfaceLum)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  /*
   * EN KRİTİK KONTROL. Birincil düğmenin dolgusu `accent-fill`, METNİ
   * beyaz (`on-accent`). Bu oran 4.5'in altına düşerse düğme yazısı
   * okunmaz olur ve bunu hiçbir derleme hatası söylemez.
   *
   * Açık mavi (`accent`) dolgu üstünde beyaz yazı ~2:1 verirdi —
   * dolgunun ayrı ve koyu bir token olmasının sebebi bu.
   */
  test.each([
    ["dolgu", ACCENT_FILL],
    ["hover", ACCENT_HOVER],
    ["active", ACCENT_ACTIVE],
  ] as const)("%s üstündeki beyaz metin en az 4.5:1 taşır", (_name, fill) => {
    expect(
      contrast(luminanceFromOklch(ON_ACCENT), luminanceFromOklch(fill)),
    ).toBeGreaterThanOrEqual(4.5);
  });

  test("açık vurgu üstünde beyaz metin AA'yı geçemez (iki rolün gerekçesi)", () => {
    expect(
      contrast(luminanceFromOklch(ON_ACCENT), luminanceFromOklch(ACCENT)),
    ).toBeLessThan(4.5);
  });

  /*
   * `warn` ile `accent` AYRIŞMALI: uyarı rozeti tıklanabilir bir şey
   * gibi okunmamalı. Turuncu (60) ile mavi (245) arasındaki hue farkı
   * bu ayrımın mekanizması.
   */
  test("uyarı rengi vurgudan en az 40 derece hue uzaklıkta durur", () => {
    expect(Math.abs(WARN.H - ACCENT.H)).toBeGreaterThanOrEqual(40);
  });

  test("uyarı rengi zemine karşı en az 3:1 taşır", () => {
    expect(contrast(luminanceFromOklch(WARN), bgLum)).toBeGreaterThanOrEqual(3);
  });
});
