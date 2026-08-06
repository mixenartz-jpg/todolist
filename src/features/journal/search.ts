import type { DateStr } from "@/lib/date/types";
import type { Note } from "./types";

/**
 * Türkçe duyarsız karşılaştırma için normalleştirme.
 *
 * `toLowerCase()` TEK BAŞINA YETMEZ. Türkçede "İ" küçük harfe
 * çevrildiğinde noktalı "i̇" (i + birleşen nokta) üretir ve bu, düz
 * "i" ile eşleşmez — "İstanbul" araması "istanbul" metnini bulamaz.
 * Aynı sorun "I" → "ı" yönünde de vardır.
 *
 * Çözüm: önce Türkçeye özgü harfleri elle eşle, sonra küçült, sonra
 * aksanları ayrıştırıp at. Böylece "sut" araması "süt"ü de bulur —
 * kullanıcı arama kutusuna aksan yazmak zorunda kalmaz.
 */
export function normalize(text: string): string {
  return text
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    // Birleşen aksan işaretleri (U+0300–U+036F). Kaçış dizisi olarak
    // yazılır: dosyada çıplak birleşen karakter bırakmak, editörden
    // editöre taşınırken sessizce bozulabilir.
    .replace(/[\u0300-\u036f]/g, "");
}

/** Notun arama için taranan metni: başlık + gövde. */
function haystack(note: Note): string {
  return normalize(`${note.title ?? ""} ${note.body}`);
}

/**
 * Notları arama metnine göre süzer.
 *
 * Sorgu boşluklarla bölünür ve TÜM parçalar bulunmalıdır (AND).
 * "market liste" araması, iki kelimenin metinde bitişik olmasını
 * beklemeden ikisini de içeren notu bulur.
 */
export function searchNotes(notes: readonly Note[], query: string): Note[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...notes];

  return notes.filter((note) => {
    const text = haystack(note);
    return terms.every((term) => text.includes(term));
  });
}

/**
 * Notları tarihe göre sıralar.
 *
 * İkincil ölçüt `createdAt`: aynı güne yazılmış notlar arasında sıra
 * kararlı olmalı, aksi halde her yeniden çizimde yer değiştirirler.
 */
export function sortNotes(notes: readonly Note[], order: SortOrder): Note[] {
  // `newest` için ters sıra: küçük (eski) değer SONRA gelmeli, yani
  // karşılaştırıcı pozitif dönmeli.
  const dir = order === "newest" ? 1 : -1;

  return [...notes].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? dir : -dir;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? dir : -dir;
    // Son çare: kimliğe göre. İki not aynı anda oluşturulmuş olsa bile
    // sıralama deterministik kalır.
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export type SortOrder = "newest" | "oldest";

export interface NoteGroup {
  date: DateStr;
  notes: Note[];
}

/**
 * Sıralanmış notları güne göre öbekler.
 *
 * Liste tarih başlıklarıyla bölünür: 40 notluk düz bir liste taranamaz,
 * gün başlıkları göz için tutamak olur.
 *
 * Girdinin ZATEN sıralı olduğu varsayılır — sıralamayı burada tekrar
 * yapmak, çağıranın seçtiği sırayı sessizce ezme riski taşır.
 */
export function groupByDate(notes: readonly Note[]): NoteGroup[] {
  const groups: NoteGroup[] = [];

  for (const note of notes) {
    const last = groups[groups.length - 1];
    if (last && last.date === note.date) {
      last.notes.push(note);
    } else {
      groups.push({ date: note.date, notes: [note] });
    }
  }

  return groups;
}

/**
 * Liste satırında gösterilecek başlık.
 *
 * Başlık boşsa gövdenin ilk satırı kullanılır: kullanıcıyı başlık
 * uydurmaya zorlamadan listenin taranabilir kalmasını sağlar.
 */
export function displayTitle(note: Note, maxLength = 80): string {
  const explicit = note.title?.trim();
  if (explicit) return explicit;

  const firstLine = note.body.trim().split("\n")[0]?.trim() ?? "";
  if (firstLine.length <= maxLength) return firstLine;
  return `${firstLine.slice(0, maxLength).trimEnd()}…`;
}
