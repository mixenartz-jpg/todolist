import { addDays, compareDates } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";

/**
 * Aralıklı tekrar merdiveni.
 *
 * ── Bu dosya bir DİRİLİŞ ──
 * `src/features/mistakes/review.ts` olarak yazılmış, testleriyle
 * birlikte çalışıyordu ve 0016 sadeleştirmesinde silindi. Mantık
 * aynen korundu; değişen tek şey artık yanlışların DENEMEYE bağlı
 * olması, ki bu merdiveni hiç ilgilendirmiyor — bu yüzden fonksiyonlar
 * satır tipine değil, taşıdığı iki alana bağlı (bkz. `TekrarDurumu`).
 *
 * ── `asama` neden TAMAMLANAN tekrar sayısı, "hangi aralık" değil? ──
 * Bu kodlama sayesinde sonraki vade `tekrarGünü + ARALIKLAR[asama]`
 * biçiminde TOTAL bir fonksiyondur ve "mezun" yalnızca
 * `asama === MEZUN_ASAMA` demektir. Alternatifte (hangi aralıktayım)
 * son adımın ötesi tanımsız kalır ve her çağıran kendi sınır
 * kontrolünü yazmak zorundadır.
 */

/**
 * Merdiven, gün cinsinden: 1 → 3 → 7 → 21.
 *
 * Türkçe YKS kaynaklarında standart olan dizi 1-3-7-15-30; buradaki
 * dört adımlık sürüm bilinçli olarak daha kısa. Gerekçe: beş adımlık
 * merdiven bir yanlışı iki ay boyunca kuyrukta tutuyor ve kuyruk
 * dolduğunda kullanıcı tamamını görmezden gelmeye başlıyor —
 * aralıklı tekrar özelliklerini öldüren başarısızlık modu tam olarak
 * budur. Dört adım, yanlışı üç haftada mezun eder.
 */
export const TEKRAR_ARALIKLARI = [1, 3, 7, 21] as const;

/** Bu aşamaya gelen yanlış bir daha tekrar kuyruğunda görünmez. */
export const MEZUN_ASAMA = TEKRAR_ARALIKLARI.length;

export interface TekrarDurumu {
  /** Tamamlanan tekrar sayısı (0..4). */
  asama: number;
  /** null ⇔ `asama === MEZUN_ASAMA` */
  sonrakiTekrar: DateStr | null;
}

/**
 * Yeni kaydedilen bir yanlışın ilk tekrar durumu: ertesi gün.
 *
 * Veritabanı bunu zaten damgalıyor (0019 trigger'ı) — bu fonksiyon
 * iyimser güncelleme (optimistic update) için var: satır sunucudan
 * dönmeden önce ekranda doğru vadeyi göstermek gerekiyor.
 */
export function ilkTekrarDurumu(tarih: DateStr): TekrarDurumu {
  return { asama: 0, sonrakiTekrar: addDays(tarih, TEKRAR_ARALIKLARI[0]) };
}

/**
 * Tekrar tamamlandı → sonraki durum.
 *
 * ── Vade TEKRARIN YAPILDIĞI GÜNDEN hesaplanır ──
 * Orijinal tarihten değil. 1'inde kaydedip 20'sine kadar uygulamayı
 * açmayan biri birikmiş tekrarları yaptığında hepsi anında yeniden
 * vadesi gelmiş olmamalıdır: asama 0 için sonraki vade 23'ü olmalı,
 * 4'ü değil. Aksi hâlde uzun bir aradan dönen kullanıcı, kuyruğu ne
 * kadar çalışırsa çalışsın boşalmadığını görür.
 *
 * ── Mezuniyet ──
 * Son aralık (21 gün) işaretlenince yanlış mezun olur. Mezun olanlar
 * çetelede ve deneme detayında TAM GÖRÜNÜR kalır; yalnızca dürtmeyi
 * bırakırlar.
 *
 * Mezun durumdan ilerletmek idempotenttir: hata atmaz, 0'a sarmaz.
 */
export function tekrariIlerlet(
  durum: TekrarDurumu,
  tekrarGunu: DateStr,
): TekrarDurumu {
  if (mezunMu(durum)) return durum;

  const sonraki = durum.asama + 1;
  if (sonraki >= MEZUN_ASAMA) {
    return { asama: MEZUN_ASAMA, sonrakiTekrar: null };
  }

  return {
    asama: sonraki,
    sonrakiTekrar: addDays(tekrarGunu, TEKRAR_ARALIKLARI[sonraki]),
  };
}

export function mezunMu(durum: TekrarDurumu): boolean {
  return durum.sonrakiTekrar === null;
}

/**
 * Vadesi geldi mi?
 *
 * Geçmiş vadeler de dahildir: kaçırılan bir tekrar KAYBOLMAMALI,
 * beklemeli. Yalnızca "bugün" eşleşseydi, bir gün uygulamayı açmayan
 * kullanıcının o günkü tekrarları sessizce düşerdi.
 */
export function vadesiGeldiMi(durum: TekrarDurumu, bugun: DateStr): boolean {
  if (durum.sonrakiTekrar === null) return false;
  return compareDates(durum.sonrakiTekrar, bugun) <= 0;
}

/** Tekrar durumunu taşıyan her satır bu şekle uyar. */
export interface TekrarTasiyan {
  id: string;
  reviewStage: number;
  nextReviewDate: DateStr | null;
}

/** Satırdan tekrar durumunu çıkarır. */
export function tekrarDurumu(satir: TekrarTasiyan): TekrarDurumu {
  return { asama: satir.reviewStage, sonrakiTekrar: satir.nextReviewDate };
}

/**
 * Vadesi gelmiş kayıtlar, EN ESKİ VADE ÖNCE.
 *
 * En çok bekleyen en üstte olmalı. Beraberlik `id` ile bozulur ki
 * sıra yeniden çizimlerde kararlı kalsın — aksi hâlde aynı güne
 * düşen iki yanlış her render'da yer değiştirir ve liste titrer.
 *
 * Jenerik: satır tipini bilmez, yalnızca `TekrarTasiyan` sözleşmesini
 * ister. Böylece `DenemeYanlis` dışında bir tür de (ileride konu
 * tekrarı) aynı kuyruğu kullanabilir.
 */
export function vadesiGelenler<T extends TekrarTasiyan>(
  kayitlar: readonly T[],
  bugun: DateStr,
): T[] {
  return kayitlar
    .filter((k) => vadesiGeldiMi(tekrarDurumu(k), bugun))
    .sort((a, b) => {
      // `nextReviewDate` burada null OLAMAZ: filtre onu zaten eledi.
      // Yine de `!` yerine açık kontrol — tip daraltması filtreden
      // taşımıyor ve sessiz bir null karşılaştırması sırayı bozardı.
      const av = a.nextReviewDate;
      const bv = b.nextReviewDate;
      if (av === null || bv === null) return 0;

      const cmp = compareDates(av, bv);
      if (cmp !== 0) return cmp;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
}
