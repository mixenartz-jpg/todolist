"use client";

import { fitDimensions, MAX_OUTPUT_BYTES } from "./image";
import type { PendingImage } from "./types";

/**
 * Görsel sıkıştırma — tarayıcı API'si sarmalayıcısı.
 *
 * ── Neden ZORUNLU, opsiyonel değil? ──
 * Snipping Tool'un 1440p ekran görüntüsü PNG olarak 1.5–4 MB'tır. Bir
 * yıl boyunca her yanlışa bir tane eklenirse bu gigabaytlar eder ve
 * mobil veride yükleme, bozulmuş gibi hissettirecek kadar yavaşlar.
 * Uzun kenar 1600px'e indirilip WebP'ye çevrilince tipik sonuç
 * 80–250 KB olur.
 *
 * Bu dosya mantık içermez; ölçekleme kararı `image.ts` içindeki saf
 * `fitDimensions` fonksiyonundadır ve orada test edilir. Kapsama
 * ölçümünden bu yüzden dışlanmıştır (bkz. vitest.config.mts).
 */

const PRIMARY_QUALITY = 0.82;

/** İlk denemede sınır aşılırsa tek seferlik daha agresif kalite. */
const FALLBACK_QUALITY = 0.6;

export class ImageTooLargeError extends Error {
  constructor() {
    super("Görsel sıkıştırıldıktan sonra bile çok büyük.");
    this.name = "ImageTooLargeError";
  }
}

/**
 * Dosyayı ölçekleyip WebP'ye çevirir.
 *
 * Çıktı sınırı aşarsa bir kez daha düşük kaliteyle denenir; yine
 * aşarsa `ImageTooLargeError` fırlatır — sessizce devasa bir dosya
 * yüklemektense kullanıcıya söylemek doğrudur.
 */
export async function compressImage(file: Blob): Promise<PendingImage> {
  const bitmap = await createImageBitmap(file);

  try {
    const { width, height } = fitDimensions(bitmap.width, bitmap.height);

    let blob = await encode(bitmap, width, height, PRIMARY_QUALITY);
    if (blob.size > MAX_OUTPUT_BYTES) {
      blob = await encode(bitmap, width, height, FALLBACK_QUALITY);
    }
    if (blob.size > MAX_OUTPUT_BYTES) {
      throw new ImageTooLargeError();
    }

    return { blob, width, height };
  } finally {
    // Bitmap'ler GC'ye bırakılırsa büyük görsellerde bellek gözle
    // görülür şekilde şişer.
    bitmap.close();
  }
}

/**
 * Bitmap'i verilen boyutta WebP'ye kodlar.
 *
 * `OffscreenCanvas` tercih edilir (ana iş parçacığını daha az meşgul
 * eder) ama Safari 17 öncesinde `convertToBlob` yoktur. Yetenek
 * kontrolü olmadan bu sessizce başarısız olur ve 4 MB'lık PNG
 * yüklenirdi — bu yüzden düz `<canvas>` yedeği ZORUNLUDUR.
 */
async function encode(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0, width, height);
      if (typeof canvas.convertToBlob === "function") {
        return canvas.convertToBlob({ type: "image/webp", quality });
      }
    }
  }

  return encodeWithCanvasElement(bitmap, width, height, quality);
}

function encodeWithCanvasElement(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Görsel işlenemedi.");
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Görsel işlenemedi."));
      },
      "image/webp",
      quality,
    );
  });
}

/**
 * Güvenli kimlik üretimi.
 *
 * `crypto.randomUUID` yalnızca güvenli bağlamda (HTTPS ya da
 * localhost) vardır. LAN IP'si üzerinden düz HTTP ile test edilirse
 * tanımsızdır — o durumda `getRandomValues` ile UUID v4 kurulur.
 */
export function randomId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // sürüm 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // varyant
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}
