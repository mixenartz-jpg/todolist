import type { DateStr } from "@/lib/date/types";
import { formatShortDate } from "@/lib/ui/tr";

/**
 * Sınav yapısı — TYT/AYT test ve soru dağılımları.
 *
 * ── Neden veritabanında DEĞİL, burada? ──
 * Bu bir KULLANICI VERİSİ değil, alan bilgisi. Tabloya konsaydı her
 * kurulumda seed gerekirdi ve dokuz yıldır değişmeyen bir sabit için
 * migration yazmak zorunda kalırdık.
 *
 * ── Otorite birim TEST, ders DEĞİL ──
 * ÖSYM'nin dağılımında bir tuzak var: TYT Sosyal'de Din Kültürü ile
 * Felsefe'nin bir kısmı BİRBİRİNİN ALTERNATİFİDİR (aday birini
 * cevaplar). Ders bazında toplamak test toplamını AŞAR. Bu yüzden
 * burada birim testtir ("Sosyal Bilimler: 20"), ders kırılımı değil.
 * Kullanıcı isterse satırı böler; varsayılan sınavın kendi birimi.
 *
 * ── Soru sayıları neden DEĞİŞTİRİLEBİLİR? ──
 * Yayınevi denemeleri resmî dağılımı birebir izlemez (38 soruluk bir
 * "TYT matematik" olağandır). Buradaki değerler ÖNERİDİR; ekran
 * düzenlemeye izin verir ve gerçek sayı satırla birlikte saklanır
 * (0018 `soru_sayisi`).
 */

/** Deneme türleri — veritabanındaki `tur` kısıtıyla birebir. */
export type DenemeTur = "tyt" | "ayt" | "brans" | "ydt";

/** AYT alanları — veritabanındaki `alan` kısıtıyla birebir. */
export type DenemeAlan = "say" | "ea" | "soz" | "dil";

/** TYT'de toplam soru. */
export const TYT_TOPLAM_SORU = 120;

/**
 * AYT'de adayın CEVAPLADIĞI soru sayısı.
 *
 * Kitapçıkta 160 soru var ama aday alanına göre yalnızca 80'ini
 * cevaplar. Trend ve net tavanı bu sayıya göre okunur.
 */
export const AYT_TOPLAM_SORU = 80;

/** Formda önceden doldurulmuş bir ders satırı. */
export interface DersSablonu {
  ders: string;
  soruSayisi: number;
  sortOrder: number;
}

/*
 * Şablonlar. Sıra SINAV DÜZENİDİR, alfabetik değil — kağıtta Türkçe
 * önce gelir ve ekranın onunla aynı sırada olması, girerken göz
 * kaymasını önler.
 */

const TYT: readonly Omit<DersSablonu, "sortOrder">[] = [
  { ders: "Türkçe", soruSayisi: 40 },
  { ders: "Sosyal Bilimler", soruSayisi: 20 },
  { ders: "Temel Matematik", soruSayisi: 40 },
  { ders: "Fen Bilimleri", soruSayisi: 20 },
];

const AYT_SAY: readonly Omit<DersSablonu, "sortOrder">[] = [
  { ders: "Matematik", soruSayisi: 40 },
  { ders: "Fen Bilimleri", soruSayisi: 40 },
];

const AYT_EA: readonly Omit<DersSablonu, "sortOrder">[] = [
  { ders: "Türk Dili ve Edebiyatı - Sosyal Bilimler-1", soruSayisi: 40 },
  { ders: "Matematik", soruSayisi: 40 },
];

const AYT_SOZ: readonly Omit<DersSablonu, "sortOrder">[] = [
  { ders: "Türk Dili ve Edebiyatı - Sosyal Bilimler-1", soruSayisi: 40 },
  { ders: "Sosyal Bilimler-2", soruSayisi: 40 },
];

const YABANCI_DIL: readonly Omit<DersSablonu, "sortOrder">[] = [
  { ders: "Yabancı Dil", soruSayisi: 80 },
];

/**
 * Tür (ve AYT ise alan) için önerilen ders satırları.
 *
 * ── Neden her çağrıda YENİ dizi? ──
 * Ekran gelen satırları düzenliyor: soru sayısını değiştirmek meşru
 * bir hareket. Paylaşılan sabit dizi dönseydi bir denemede yapılan
 * düzenleme sonraki denemeye sızardı — sessiz ve teşhisi zor bir hata.
 *
 * Branş boş döner: branşın sabit bir dağılımı yoktur ("40 soruluk
 * matematik" de "20 soruluk paragraf" da branştır) ve varsayılan
 * dayatmak kullanıcıyı her seferinde silmeye zorlardı.
 */
export function derslerIcin(
  tur: DenemeTur,
  alan: DenemeAlan | null,
): DersSablonu[] {
  const sablon = sablonSec(tur, alan);
  return sablon.map((d, i) => ({ ...d, sortOrder: i }));
}

function sablonSec(
  tur: DenemeTur,
  alan: DenemeAlan | null,
): readonly Omit<DersSablonu, "sortOrder">[] {
  if (tur === "tyt") return TYT;
  if (tur === "ydt") return YABANCI_DIL;
  // Branş: dersi kullanıcı seçer.
  if (tur === "brans") return [];

  // Buradan sonrası AYT. Alan olmadan hangi 80 sorunun cevaplandığı
  // bilinemez, dolayısıyla önerilecek bir satır da yok.
  if (alan === "say") return AYT_SAY;
  if (alan === "ea") return AYT_EA;
  if (alan === "soz") return AYT_SOZ;
  if (alan === "dil") return YABANCI_DIL;
  return [];
}

/** Şablonun toplam soru sayısı. */
export function toplamSoru(dersler: readonly DersSablonu[]): number {
  return dersler.reduce((sum, d) => sum + d.soruSayisi, 0);
}

/**
 * Bu tür alan bilgisi ister mi?
 *
 * Veritabanındaki `deneme_alan_tutarli` kısıtının istemci tarafı:
 * AYT alan taşımak ZORUNDA, diğerleri taşıyamaz. Formda alan
 * seçicisinin görünürlüğünü bu belirler.
 */
export function aytAlanGerekir(tur: DenemeTur): boolean {
  return tur === "ayt";
}

const TUR_ADI: Record<DenemeTur, string> = {
  tyt: "TYT",
  ayt: "AYT",
  brans: "Branş",
  ydt: "YDT",
};

/**
 * Form açılırken önerilen ad: "TYT denemesi · 21 Eylül".
 *
 * Ad zorunlu (0018) ve boş bırakılamıyorsa anlamlı bir başlangıç
 * verilmeli — yoksa kullanıcı her kayıtta sıfırdan yazar ve giriş
 * hızı hedefi (~30 saniye) daha ilk alanda kaybedilir. Kullanıcı
 * üzerine yazabilir; bu bir öneri, dayatma değil.
 */
export function varsayilanAd(tur: DenemeTur, tarih: DateStr): string {
  return `${TUR_ADI[tur]} denemesi · ${formatShortDate(tarih)}`;
}
