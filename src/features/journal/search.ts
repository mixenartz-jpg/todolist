import type { DateStr } from "@/lib/date/types";
import { normalize } from "@/lib/text/normalize";
import type { Note } from "./types";

/*
 * `normalize` artık `@/lib/text/normalize` içinde yaşıyor: yanlış
 * çetelesi de ders/konu eşleştirmesinde aynı Türkçe katlamaya ihtiyaç
 * duyuyor. Buradan yeniden dışa aktarılıyor ki mevcut çağıranlar
 * (ve `search.test.ts`) değişmeden kalsın.
 */
export { normalize };

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

/**
 * Başlığın ALTINDA gösterilecek gövde — yani açılıp kapanan kısım.
 *
 * `displayTitle` ile birlikte okunmalı: ikisi notu ikiye böler ve
 * aralarında metin ne kaybolur ne tekrarlanır.
 *
 * Üç durum var:
 *
 * 1. Başlık AÇIKÇA yazılmışsa gövdenin tamamı döner — başlık gövdeden
 *    türemediği için hiçbir satır zaten görünmüş değildir.
 *
 * 2. Başlık türetilmişse ilk satır zaten başlıktadır; yalnızca
 *    sonrası döner. Tek satırlık bir notta boş dize döner — açılacak
 *    şey yoktur, çağıran oku hiç çizmemelidir.
 *
 * 3. Türetilmiş başlık `maxLength`'i AŞTIYSA `displayTitle` onu "…" ile
 *    kırpar ve gerisi hiçbir yerde görünmez. O yüzden bu durumda TAM
 *    ilk satır (ve varsa sonrası) döner: kırpılan metnin okunacak bir
 *    yeri olur.
 */
export function noteBody(note: Note, maxLength = 80): string {
  const explicit = note.title?.trim();
  if (explicit) return note.body.trim();

  const trimmed = note.body.trim();
  const breakAt = trimmed.indexOf("\n");
  const firstLine = (breakAt === -1 ? trimmed : trimmed.slice(0, breakAt)).trim();

  if (firstLine.length > maxLength) return trimmed;

  return breakAt === -1 ? "" : trimmed.slice(breakAt + 1).trim();
}
