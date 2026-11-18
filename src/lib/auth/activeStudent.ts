/**
 * Koçun ŞU AN baktığı öğrenci.
 *
 * Seçim cihaz başına bir çerezde durur (`kero_student`): telefonda
 * öğrenci değiştirmek, bilgisayarda açık duran ekranı etkilemesin.
 * Sunucu çerezi `getViewer`'da okuyup doğrular; istemci de aynı değeri
 * `ViewerProvider` üzerinden buraya yazar.
 *
 * İki iş görür:
 *   • YAZMA — tarayıcı istemcisi her isteğe `x-kero-student` başlığını
 *     ekler; veritabanı yeni satırın öğrencisini oradan alır
 *     (`scope_student`, 0039). Ekleme yollarının hiçbiri öğrenciyi
 *     ayrıca bilmek zorunda değil.
 *   • OKUMA — koç RLS gereği bütün öğrencilerinin satırlarını okuyabilir;
 *     sorgular `activeStudentId()` ile süzülür.
 */

export const STUDENT_COOKIE = "kero_student";
export const STUDENT_HEADER = "x-kero-student";

let current: string | null = null;

export function setActiveStudentId(id: string | null): void {
  current = id;
}

export function activeStudentId(): string | null {
  return current;
}

/** Öğrenci değiştir: çerezi yaz, sayfayı baştan yükle (önbellek temizlenir). */
export function switchStudent(id: string): void {
  document.cookie = `${STUDENT_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`;
  window.location.reload();
}

/*
 * Postgrest sorgu kurucusunun yalnızca kullandığımız iki yöntemi. Tip
 * parametresi kısıtsız: kurucunun derin jenerikleri bir `extends`
 * kısıtıyla karşılaştırılınca TS "excessively deep" hatası veriyor.
 */
interface Filterable {
  eq(column: string, value: string): unknown;
  is(column: string, value: null): unknown;
}

/**
 * Sorguyu etkin öğrenciye daralt. Öğrenci yoksa (koçun henüz öğrencisi
 * yok) öğrencisiz satırlar.
 */
export function forActiveStudent<Q>(query: Q, column = "student_id"): Q {
  const q = query as Filterable;
  return (current ? q.eq(column, current) : q.is(column, null)) as Q;
}

/**
 * Öğrencinin KENDİ hesabında yaşayan tablolar (denemeler, eksik
 * havuzu…): seçili öğrenci varsa ona daralt; yoksa süzme (koçun
 * öğrencisi yok → yalnızca kendi satırları zaten RLS'ten gelir).
 */
export function forActiveOwner<Q>(query: Q, column: string): Q {
  return current ? ((query as Filterable).eq(column, current) as Q) : query;
}
