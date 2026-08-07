import type { DateStr } from "@/lib/date/types";

/**
 * Sorgu anahtarları — tek kaynak.
 *
 * Hiyerarşi önemlidir: `entries()` öneki tüm aralık sorgularını kapsar,
 * böylece bir hücre değişikliği o tarihi içeren TÜM önbellek
 * aralıklarını tek seferde bulup yamalayabilir. Matris ayı, Bugün
 * günü ve İstatistik yılı çakışan aralıklardır; biri güncellenip
 * diğeri kalırsa ekranlar arası tutarsızlık oluşur.
 */
export const qk = {
  routines: () => ["routines"] as const,

  entries: () => ["entries"] as const,
  entriesRange: (from: DateStr, to: DateStr) =>
    ["entries", "range", from, to] as const,

  tasks: () => ["tasks"] as const,
  tasksDay: (date: DateStr) => ["tasks", "day", date] as const,

  notes: () => ["notes"] as const,
  note: (date: DateStr) => ["notes", date] as const,

  /*
   * Serbest defter. Anahtar "notes" DEĞİL "journal" — `qk.notes()`
   * zaten `qk.note(date)`'in önekidir ve TanStack Query önek eşleşmesi
   * yapar. Defteri de "notes" altına koysaydık, bir defter notunu
   * kaydetmek TÜM günlük notların önbelleğini geçersiz kılardı.
   */
  journal: () => ["journal"] as const,

  /*
   * Yanlışlar. Liste TEK sorgudur; çetele tablosu ve Bugün ekranının
   * tekrar kuyruğu istemcide bu listeden türetilir. Ayrı bir "tally"
   * ya da "due" anahtarı YOKTUR — olsaydı her yeni yanlış birden çok
   * anahtarı kilit adımda geçersiz kılmak zorunda kalır ve ikinci bir
   * doğruluk kaynağı doğardı.
   */
  mistakes: () => ["mistakes"] as const,

  /*
   * İmzalı görsel URL'i. "mistakes" ÖNEKİNİN ALTINDA DEĞİL: yeni bir
   * yanlış eklenince `qk.mistakes()` geçersiz kılınır ve önek eşleşmesi
   * yüzünden tüm imzalı URL'ler de çöpe giderdi — her satır için
   * gereksiz yeniden imzalama demek olurdu. İmza yalnızca süresi
   * dolunca yenilenmelidir.
   */
  mistakeImage: (path: string) => ["mistake-image", path] as const,
} as const;
