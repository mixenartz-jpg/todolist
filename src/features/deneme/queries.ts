"use client";

import { useQuery } from "@tanstack/react-query";
import { asDateStr } from "@/lib/date/date";
import type {
  DenemeDersRow,
  DenemeRow,
  DenemeYanlisRow,
} from "@/lib/db/database.types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { HataTuru } from "./hatasepeti";
import type { DenemeAlan, DenemeTur } from "./sinav";
import type { Deneme, DenemeDers, DenemeDetayli, DenemeYanlis } from "./types";

/**
 * Tüm denemeler, ders satırlarıyla birlikte — TEK sorgu.
 *
 * ── Neden tarihe göre bölünmüyor? ──
 * `usePlanGoals`/`useWeekGoals` ölçeğe bölünür çünkü hedefler yıllar
 * boyunca birikir ama ekran hep tek ay okur. Denemede bu TERSİNE
 * işliyor: trend çizgisinin tamamı görülmek İÇİN var. Aya bölünse
 * bir yılın trendi on iki ağ turu olurdu. Hacim de küçük — haftada
 * bir-iki deneme, yılda ~100 satır.
 *
 * ── Ders satırları neden gömülü? ──
 * Net onlardan türetiliyor (`toplamNet`); derssiz bir deneme satırı
 * listede "— net" diye görünürdü. Ayrı sorgu, her satır için ikinci
 * bir bekleme ve iki ayrı yükleme durumu demekti. PostgREST'in
 * gömülü seçimi ikisini tek turda getiriyor.
 */
export function useDenemeler() {
  return useQuery({
    queryKey: qk.denemeler(),
    queryFn: fetchDenemeler,
  });
}

/** Ders satırlarını gömen PostgREST seçimi. Tek yerde yazılır. */
const DENEME_SELECT = "*, deneme_dersleri(*)";

/** Gömülü seçimin dönüş şekli — satır + ilişkili ders dizisi. */
type DenemeWithDersler = DenemeRow & { deneme_dersleri: DenemeDersRow[] };

async function fetchDenemeler(): Promise<DenemeDetayli[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("denemeler")
    .select(DENEME_SELECT)
    /*
     * Index ile aynı sıra (denemeler_user_tarih_idx): en yeni deneme
     * üstte. Kullanıcı listeyi "son ne yaptım" diye açar; kronolojik
     * artan sıra onu her seferinde listenin dibine kaydırırdı.
     *
     * `created_at` ikincil: aynı gün iki deneme çözülmesi olağan ve
     * sırasız kalsalar her yüklemede yer değiştirirlerdi.
     */
    .order("tarih", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as DenemeWithDersler[]).map(toDenemeDetayli);
}

/**
 * Tek denemenin detayı.
 *
 * Listeden ayrı bir sorgu: detay sayfası doğrudan bir bağlantıyla
 * (yer imi, yenileme) açılabilmeli ve o durumda liste önbellekte
 * YOKTUR. Listeden türetmeye kalkmak, derin bağlantıyı bozardı.
 */
export function useDeneme(id: string) {
  return useQuery({
    queryKey: qk.deneme(id),
    queryFn: () => fetchDeneme(id),
  });
}

async function fetchDeneme(id: string): Promise<DenemeDetayli> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("denemeler")
    .select(DENEME_SELECT)
    .eq("id", id)
    .single();

  if (error) throw error;
  return toDenemeDetayli(data as DenemeWithDersler);
}

/**
 * Bir denemenin yanlışları.
 *
 * Denemeden AYRI sorgu — gömülü getirilmemesi bilinçli: bir denemenin
 * elli yanlışı olabilir ve liste ekranı onların hiçbirini göstermez.
 * Gömülü olsalardı liste sorgusu ders satırlarıyla birlikte yüzlerce
 * satır taşırdı.
 */
export function useDenemeYanlislari(denemeId: string) {
  return useQuery({
    queryKey: qk.denemeYanlislariFor(denemeId),
    queryFn: () => fetchDenemeYanlislari(denemeId),
  });
}

async function fetchDenemeYanlislari(
  denemeId: string,
): Promise<DenemeYanlis[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("deneme_yanlislari")
    .select("*")
    .eq("deneme_id", denemeId)
    /*
     * Ders bazlı gruplanmış, içinde soru numarasına göre sıralı:
     * yanlışlar kağıtta böyle duruyor ve ızgarayı aynı sırada görmek
     * "hangisini eklemiştim" sorusunu ortadan kaldırıyor.
     *
     * `soru_no` null olabilir — Postgres varsayılanı onları SONA atar
     * (`nulls last` artan sırada varsayılan) ve bu doğru yer:
     * numarasız kayıtlar numaralı olanların arasına karışmaz.
     */
    .order("ders", { ascending: true })
    .order("soru_no", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as DenemeYanlisRow[]).map(toDenemeYanlis);
}

/**
 * Vadesi gelmiş tekrarlar — Bugün ekranının kuyruğu.
 *
 * `lte` (küçük veya eşit), `eq` DEĞİL: kullanıcı iki gün uygulamayı
 * açmazsa o günlerin tekrarları GEÇMİŞTE kalır. Tam eşitlik arasaydı
 * kaçırılan tekrarlar sessizce kaybolur ve merdiven kopardı.
 */
export function useDenemeTekrarlari(bugun: string) {
  return useQuery({
    queryKey: qk.denemeTekrarlari(asDateStr(bugun)),
    queryFn: () => fetchDenemeTekrarlari(bugun),
  });
}

async function fetchDenemeTekrarlari(bugun: string): Promise<DenemeYanlis[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("deneme_yanlislari")
    .select("*")
    /*
     * Mezun olanlar (`next_review_date is null`) bu filtreyle
     * kendiliğinden dışarıda kalır: SQL'de `null <= tarih` NULL'dır,
     * yani yanlıştır. Ayrı bir `not.is null` koşulu gerekmez.
     */
    .lte("next_review_date", bugun)
    .order("next_review_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as DenemeYanlisRow[]).map(toDenemeYanlis);
}

/* ── Satır → uygulama tipi dönüşümleri ────────────────────────── */

export function toDeneme(row: DenemeRow): Deneme {
  return {
    id: row.id,
    ad: row.ad,
    /*
     * `as` daraltması: sütunda check kısıtı var (0018) ama üretilen
     * tip `string`. Veritabanı kısıtı bu değerin geçerliliğini zaten
     * garanti ediyor; burada doğrulama tekrarlamak, asla
     * çalışmayacak bir dal ve onu kapsayan bir test borcu yaratırdı.
     */
    tur: row.tur as DenemeTur,
    alan: row.alan as DenemeAlan | null,
    tarih: asDateStr(row.tarih),
    sureDk: row.sure_dk,
    note: row.note,
  };
}

export function toDenemeDers(row: DenemeDersRow): DenemeDers {
  return {
    id: row.id,
    denemeId: row.deneme_id,
    ders: row.ders,
    dogru: row.dogru,
    yanlis: row.yanlis,
    bos: row.bos,
    soruSayisi: row.soru_sayisi,
    /*
     * `numeric` STRING gelir — dosyanın başındaki uyarı (database.types)
     * tam olarak burayı işaret ediyor. Dönüşüm SINIRDA yapılır; içeride
     * `hedefNet` her zaman `number | null`.
     *
     * `Number(null)` 0 verir ve bu sessiz bir hata olurdu ("hedef
     * koymadım" → "hedefim 0 net"), bu yüzden null ayrı ele alınıyor.
     */
    hedefNet: row.hedef_net === null ? null : Number(row.hedef_net),
    sortOrder: row.sort_order,
  };
}

function toDenemeDetayli(row: DenemeWithDersler): DenemeDetayli {
  return {
    ...toDeneme(row),
    /*
     * Sıralama İSTEMCİDE: gömülü seçimde PostgREST'e ilişki sırası
     * vermek mümkün ama sözdizimi kırılgan ve sessizce göz ardı
     * edilebiliyor. Ders satırı sayısı bir elin parmakları kadar;
     * burada sıralamak hem ucuz hem gözle görülür.
     */
    dersler: row.deneme_dersleri
      .map(toDenemeDers)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export function toDenemeYanlis(row: DenemeYanlisRow): DenemeYanlis {
  return {
    id: row.id,
    denemeId: row.deneme_id,
    ders: row.ders,
    konu: row.konu,
    soruNo: row.soru_no,
    hataTuru: row.hata_turu as HataTuru | null,
    note: row.note,
    imagePath: row.image_path,
    imageWidth: row.image_width,
    imageHeight: row.image_height,
    reviewStage: row.review_stage,
    nextReviewDate:
      row.next_review_date === null ? null : asDateStr(row.next_review_date),
  };
}
