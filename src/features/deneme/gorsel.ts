"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { randomId } from "./compress";
import { imagePath } from "./image";
import { DENEME_BUCKET, type PendingImage } from "./types";

/**
 * Yanlış görselleri — storage okuma/yazma (0020).
 *
 * ── Neden `queries.ts`'te değil? ──
 * Oradaki her şey Postgres satırı okur; burası storage nesnesi okur ve
 * bambaşka bir hata yüzeyi taşır (imza süresi dolması, yetim dosya,
 * yükleme yarıda kesilmesi). Ayrı dosya, "satır mı nesne mi" sorusunu
 * dosya adıyla cevaplıyor.
 */

/**
 * İmzalı URL'in ömrü.
 *
 * Bir saat: kullanıcının bir denemenin yanlışlarına bakıp
 * etiketlemesi dakikalar sürer, saatler değil. Daha uzun bir süre,
 * paylaşılan bir ekranda kalan URL'in daha uzun süre geçerli olması
 * demekti — sınav soruları kullanıcının özel materyali.
 */
const IMZA_SURESI_SN = 60 * 60;

/**
 * Önbellek süresi imzadan KISA tutulur.
 *
 * Eşit olsaydı, önbellekteki URL tam süresi dolduğu anda kullanılır
 * ve görsel kırık görünürdü. Beş dakikalık pay, tazelemenin süre
 * dolmadan gerçekleşmesini garanti ediyor.
 */
const ONBELLEK_SURESI_MS = (IMZA_SURESI_SN - 300) * 1000;

/**
 * Bir görselin imzalı URL'i.
 *
 * ── Neden URL SAKLANMIYOR? ──
 * Satırda `image_path` var, URL yok (0019). İmzalı URL bir saat
 * yaşıyor; satıra yazılsaydı ertesi gün açılan sayfada kırık görsel
 * olurdu. Yol kalıcı, imza her görüntülemede tazelenir.
 */
export function useYanlisGorselUrl(path: string) {
  return useQuery({
    queryKey: ["deneme-gorsel", path],
    queryFn: () => imzaliUrl(path),
    /*
     * `staleTime` ile `gcTime` birlikte: URL bayatlamadan yeniden
     * kullanılır, ama ızgarada aşağı kaydırılıp geri gelindiğinde
     * yeni bir imza isteği de atılmaz.
     */
    staleTime: ONBELLEK_SURESI_MS,
    gcTime: ONBELLEK_SURESI_MS,
    /*
     * Pencereye geri dönünce yeniden çekme KAPALI: sekme arasında
     * gidip gelmek her seferinde bir imza isteği demekti. Süre
     * dolduğunda `staleTime` zaten tazelemeyi tetikler.
     */
    refetchOnWindowFocus: false,
  });
}

async function imzaliUrl(path: string): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from(DENEME_BUCKET)
    .createSignedUrl(path, IMZA_SURESI_SN);

  if (error) throw error;
  return data.signedUrl;
}

/**
 * Sıkıştırılmış görseli yükler ve storage yolunu döndürür.
 *
 * ── Yol bir GÜVENLİK SINIRI ──
 * `<user_id>/<uuid>.webp`. İlk segment kullanıcı kimliği ve 0020'nin
 * politikaları `(storage.foldername(name))[1] = auth.uid()` ile bunu
 * zorunlu kılıyor. Kimlik istemciden ALINMAZ, oturumdan okunur —
 * çağıranın geçirdiği bir kimliğe güvenmek, politikanın atlatılmaya
 * çalışılabileceği tek yer olurdu.
 */
export async function yukleGorsel(image: PendingImage): Promise<string> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error("Oturum bulunamadı, tekrar giriş yapın.");

  const path = imagePath(user.id, randomId());

  const { error } = await supabase.storage
    .from(DENEME_BUCKET)
    .upload(path, image.blob, {
      contentType: "image/webp",
      /*
       * `upsert: false`: yol her yüklemede yeni bir UUID taşıyor,
       * yani çakışma ancak UUID çarpışmasıyla olurdu. O durumda
       * sessizce üzerine yazmak, başka bir yanlışın görselini yok
       * etmek demekti — hata almak doğrusu.
       */
      upsert: false,
    });

  if (error) throw error;
  return path;
}

/**
 * Görseli storage'dan siler.
 *
 * Hata YUTULMAZ ama çağıranın onu ölümcül saymaması beklenir: satır
 * silindikten sonra dosyanın kalması yetim bir nesne bırakır ve bu
 * özel bucket'ta erişilemez durumdadır — yer kaplar, veri sızdırmaz.
 * Kullanıcıyı "görsel silinemedi" diye uyarmak, onun yapabileceği
 * bir şey olmadığı için gürültüden ibaret olurdu.
 */
export async function silGorsel(path: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(DENEME_BUCKET).remove([path]);
  if (error) throw error;
}
