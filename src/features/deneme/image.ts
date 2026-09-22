/**
 * Görsel yükleme yolunun SAF parçaları.
 *
 * Tarayıcı API'si kullanan sıkıştırma `compress.ts` içindedir. Bu ayrım
 * bilinçlidir: buradaki her şey node ortamında test edilebilir, dolayısıyla
 * yapıştırma/boyutlandırma mantığı bileşen testi yazmadan doğrulanır.
 */

/** Uzun kenar sınırı. Ekran görüntüsü okunabilirliği için yeterli. */
export const MAX_EDGE = 1600;

/** Sıkıştırmadan ÖNCE reddedilen girdi boyutu. */
export const MAX_INPUT_BYTES = 8 * 1024 * 1024;

/** Sıkıştırmadan SONRA kabul edilen üst sınır. */
export const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

export const ACCEPTED_MIME = ["image/webp", "image/png", "image/jpeg"] as const;

/**
 * Uzun kenarı `maxEdge`'e sığdıran boyutlar.
 *
 * ASLA BÜYÜTMEZ: zaten küçük bir görseli şişirmek bant genişliği harcar
 * ve tek kazandığı şey bulanıklıktır.
 */
export function fitDimensions(
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };

  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Storage yolu: `<user_id>/<uuid>.webp`.
 *
 * İlk segment kullanıcı kimliğidir ve `storage.objects` politikaları
 * bunu zorunlu kılar — yol bir GÜVENLİK SINIRIDIR, kozmetik düzen değil.
 */
export function imagePath(userId: string, id: string): string {
  return `${userId}/${id}.webp`;
}

/**
 * `DataTransferItem`'ın test edilebilir asgari yüzeyi.
 *
 * DOM tipini almak yerine yapısal bir arayüz almak, yapıştırma seçimini
 * node ortamında düz nesnelerle test edilebilir kılar.
 */
export interface ClipboardLikeItem {
  kind: string;
  type: string;
}

/**
 * Pano öğelerinden ilk görseli seçer.
 *
 * Gerçek durum: Snipping Tool'dan yapıştırma HEM bir `text/html` string
 * öğesi HEM de bir `image/png` dosya öğesi üretir. Yalnızca `kind`'ı
 * "file" olan ve mime'ı `image/` ile başlayan ilk öğe alınır.
 *
 * Eşleşme yoksa `null` döner ve çağıran hiçbir şey yapmaz — böylece düz
 * metin yapıştırması normal şekilde odaklı input'a akar.
 */
export function pickImageItem<T extends ClipboardLikeItem>(
  items: readonly T[],
): T | null {
  for (const item of items) {
    if (item.kind === "file" && item.type.startsWith("image/")) return item;
  }
  return null;
}

/**
 * Girdi kabul edilebilir mi? Kabul edilirse `null`, aksi halde Türkçe
 * hata metni döner.
 *
 * Boyut kontrolü DECODE'DAN ÖNCE yapılır: 40 MB'lık bir dosyayı
 * çözmeye başlayıp sonra reddetmek sekmeyi dondurur.
 */
export function validateImageInput(type: string, size: number): string | null {
  if (!type.startsWith("image/")) {
    return "Yalnızca görsel dosyası eklenebilir.";
  }
  if (!ACCEPTED_MIME.includes(type as (typeof ACCEPTED_MIME)[number])) {
    return "Yalnızca PNG, JPEG veya WebP desteklenir.";
  }
  if (size > MAX_INPUT_BYTES) {
    return `Görsel çok büyük (en fazla ${formatMb(MAX_INPUT_BYTES)}).`;
  }
  return null;
}

function formatMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
