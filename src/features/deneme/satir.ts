import { parseSayi } from "./format";
import { derslerIcin, type DenemeAlan, type DenemeTur } from "./sinav";
import { DERS_AD_MAX, type DenemeDersDraft } from "./types";

/**
 * Deneme formunun ders satırı mantığı.
 *
 * ── Neden bileşenden AYRI? ──
 * Burası formun karar verdiği yer: hangi satır kaydedilir, hangisi
 * atlanır, hangisi kaydetmeyi engeller. Bu mantık JSX'in içinde
 * kalsaydı ancak tarayıcı açılarak sınanabilirdi; saf modül olarak
 * her sınır durumu bedavaya test edilebiliyor (`satir.test.ts`).
 *
 * Projedeki yerleşik disiplin: `goal.ts`, `sort.ts`, `review.ts` —
 * hepsi aynı sebeple bileşenden dışarı çekilmiş.
 */

/** Formdaki tek ders satırı — sayılar METİN olarak tutulur. */
export interface DersSatiri {
  /**
   * React anahtarı — satırın ÖMÜR BOYU sabit kimliği.
   *
   * ── Neden dizi indeksi YETMEZ? ──
   * Satırlar ortadan silinebiliyor (`satirSil`). İndeks anahtar
   * olsaydı, üçüncü satır silindiğinde dördüncü satır üçüncünün
   * DOM düğümünü devralırdı: imleç, odak ve kırmızı hata kenarlığı
   * yanlış satıra sıçrar. Kullanıcı dört sayı yazarken bu görünür
   * bir bozulma.
   *
   * `sortOrder` de yetmez — o kaydedilecek SIRAYI taşıyor ve satır
   * eklenip silindikçe yeniden veriliyor. Kimlik ile sıra iki ayrı
   * şeydir.
   */
  id: string;
  ders: string;
  /*
   * Neden string, number değil?
   *
   * Kullanıcı "12"yi silip "3" yazarken alan bir an boş kalır. Sayı
   * olarak tutulsaydı o an 0'a düşerdi ve net yanlış bir değere
   * sıçrayıp geri gelirdi — yazarken göz ucuyla görülen bir titreme.
   * Metin, "boş" ile "sıfır"ı da ayırt eder.
   */
  dogru: string;
  yanlis: string;
  soruSayisi: string;
  sortOrder: number;
}

/**
 * Bir form satırının üç hâli.
 *
 * `parseSayi`'nin üç durumlu sözleşmesinin satır ölçeğine taşınmış
 * hâli:
 *   · `bos`   → dokunulmamış satır; kaydetmeyi ENGELLEMEZ, atlanır
 *   · `dolu`  → geçerli, nete katılır
 *   · `bozuk` → kaydetmeyi engeller
 *
 * "Boş" ile "bozuk" ayrılmasaydı, şablonun getirdiği ama
 * doldurulmayan bir satır (o gün Fen çözülmediyse) formu kilitlerdi —
 * kullanıcı da neden kaydedemediğini anlamazdı, çünkü ekranda hata
 * gösterecek bir alan yok.
 */
export interface CozumlenmisSatir {
  durum: "bos" | "dolu" | "bozuk";
  /** Türetilen boş sayısı; `null` = hesaplanamıyor. */
  bos: number | null;
  /** Yalnızca `durum === "dolu"` iken dolu. */
  deger: DenemeDersDraft | null;
}

/** Bir satırın en büyük kabul edilen sayısı — 0018 kısıtıyla aynı. */
const SORU_MAX = 200;

/**
 * Satırı çözümler: kaydedilir mi, atlanır mı, engeller mi?
 *
 * Boş sayısı BURADA türetilir (`soruSayisi − doğru − yanlış`) —
 * girişin hızlı olmasının dayanağı. Kullanıcı iki sayı yazar,
 * üçüncüsü kendiliğinden dolar.
 */
export function cozumleSatir(satir: DersSatiri): CozumlenmisSatir {
  const dogru = parseSayi(satir.dogru, SORU_MAX);
  const yanlis = parseSayi(satir.yanlis, SORU_MAX);
  const soruSayisi = parseSayi(satir.soruSayisi, SORU_MAX);
  const dersAdi = satir.ders.trim();

  /*
   * Sayı girilmemişse satır DOKUNULMAMIŞ sayılır — ders adı dolu
   * olsa bile. Şablon ders adlarını kendisi dolduruyor; adın varlığı
   * kullanıcının o dersi çözdüğü anlamına gelmez.
   */
  if (dogru === null && yanlis === null) {
    return { durum: "bos", bos: null, deger: null };
  }

  const bozuk =
    dersAdi === "" ||
    dersAdi.length > DERS_AD_MAX ||
    dogru === undefined ||
    yanlis === undefined ||
    soruSayisi === undefined ||
    // Sayı girilmiş ama soru sayısı yok: boş türetilemez, dolayısıyla
    // 0018'in `dogru + yanlis + bos = soru_sayisi` kısıtı sağlanamaz.
    soruSayisi === null;

  if (bozuk) return { durum: "bozuk", bos: null, deger: null };

  /*
   * Eksik kalan tek alanı 0 say: kullanıcı "8 yanlış" yazıp doğruyu
   * boş bıraktıysa kastettiği 0 doğrudur. Bunu "girilmemiş" saymak,
   * gerçekten 0 doğru yapmış bir kullanıcıyı satırını
   * kaydedemez duruma düşürürdü.
   */
  const d = dogru ?? 0;
  const y = yanlis ?? 0;
  const bos = soruSayisi - d - y;

  // Taşma: doğru + yanlış soru sayısını aşıyor. Veritabanı da
  // reddederdi (0018 check), ama oraya varmadan yakalamak gerekiyor —
  // sunucu hatası hangi satırın bozuk olduğunu söylemez.
  if (bos < 0) return { durum: "bozuk", bos: null, deger: null };

  return {
    durum: "dolu",
    bos,
    deger: {
      ders: dersAdi,
      dogru: d,
      yanlis: y,
      bos,
      soruSayisi,
      hedefNet: null,
      sortOrder: satir.sortOrder,
    },
  };
}

/** Tür (ve alan) için formun açılış satırları. */
export function baslangicSatirlari(
  tur: DenemeTur,
  alan: DenemeAlan | null,
): DersSatiri[] {
  const sablon = derslerIcin(tur, alan);

  /*
   * Branş ve alansız AYT şablonsuz gelir (bkz. `derslerIcin`).
   * Tamamen boş bir tablo "buraya ne yazacağım" sorusu doğururdu;
   * tek boş satır hem yeri gösterir hem de dayatma değildir.
   */
  if (sablon.length === 0) return [bosSatir(0)];

  return sablon.map((s) => ({
    id: satirKimligi(),
    ders: s.ders,
    dogru: "",
    yanlis: "",
    soruSayisi: String(s.soruSayisi),
    sortOrder: s.sortOrder,
  }));
}

/** Boş bir satır — form açılışında ve "+ Ders ekle" ile. */
export function bosSatir(sortOrder: number): DersSatiri {
  return {
    id: satirKimligi(),
    ders: "",
    dogru: "",
    yanlis: "",
    soruSayisi: "",
    sortOrder,
  };
}

let satirSayaci = 0;

/**
 * Satır kimliği üretir.
 *
 * `crypto.randomUUID` DEĞİL, artan sayaç: bu kimlik hiçbir zaman
 * veritabanına gitmiyor, ağdan geçmiyor ve tahmin edilmesinin bir
 * sonucu yok — tek işi React'in reconciliation'ında satırı ayırt
 * etmek. Sayaç hem ucuz hem güvenli bağlam (HTTPS) gerektirmiyor.
 */
function satirKimligi(): string {
  satirSayaci += 1;
  return `satir-${satirSayaci}`;
}

/**
 * Form kaydedilebilir mi?
 *
 * İki koşul: hiçbir satır BOZUK olmayacak ve EN AZ BİR satır dolu
 * olacak. İkincisi olmasaydı sıfır dersli bir deneme kaydedilir,
 * listede "0,00 net" diye görünür ve kullanıcı onu silmek zorunda
 * kalırdı.
 */
export function satirlarGecerli(
  cozumler: readonly CozumlenmisSatir[],
): boolean {
  return (
    cozumler.every((c) => c.durum !== "bozuk") &&
    cozumler.some((c) => c.durum === "dolu")
  );
}

/** Kaydedilecek ders taslakları — sıra numaraları yeniden verilir. */
export function kaydedilecekDersler(
  cozumler: readonly CozumlenmisSatir[],
): DenemeDersDraft[] {
  return cozumler
    .filter((c) => c.durum === "dolu" && c.deger !== null)
    /*
     * `sortOrder` YENİDEN veriliyor: aradaki boş satırlar atlandığı
     * için orijinal sıra numaraları delikli olurdu (0, 2, 3). Delik
     * bir hata değil ama sonradan satır eklendiğinde sıralamanın
     * nereye düşeceğini tahmin edilemez kılar.
     */
    .map((c, i) => ({ ...c.deger!, sortOrder: i }));
}
