import { describe, expect, test } from "vitest";
import { asDateStr } from "@/lib/date/date";
import {
  displayTitle,
  groupByDate,
  normalize,
  noteBody,
  searchNotes,
  sortNotes,
} from "./search";
import type { Note } from "./types";

function note(over: Partial<Note> & { id: string }): Note {
  return {
    title: null,
    body: "gövde",
    date: asDateStr("2026-08-06"),
    createdAt: "2026-08-06T10:00:00Z",
    updatedAt: "2026-08-06T10:00:00Z",
    ...over,
  };
}

describe("normalize", () => {
  test("büyük İ ile küçük i eşleşir", () => {
    // toLowerCase() tek başına "İ" için noktalı i (i + U+0307) üretir
    // ve düz "i" ile eşleşmez. Bu testin kırılması aramanın Türkçe
    // metinlerde sessizce bozulduğu anlamına gelir.
    expect(normalize("İstanbul")).toBe(normalize("istanbul"));
  });

  test("noktasız ı ile düz i eşleşir", () => {
    expect(normalize("Sınır")).toBe(normalize("sinir"));
    expect(normalize("ISPARTA")).toBe(normalize("isparta"));
  });

  test("aksanlar kaldırılır: kullanıcı aksansız arayabilir", () => {
    expect(normalize("süt")).toBe(normalize("sut"));
    expect(normalize("ÇOK")).toBe(normalize("cok"));
    expect(normalize("Öğle")).toBe(normalize("ogle"));
    expect(normalize("ŞEKER")).toBe(normalize("seker"));
  });
});

describe("searchNotes", () => {
  const notes = [
    note({ id: "a", title: "Market listesi", body: "süt, ekmek" }),
    note({ id: "b", title: null, body: "İstanbul'a taşınma planı" }),
    note({ id: "c", title: "Kitap", body: "Yüzyıllık Yalnızlık" }),
  ];

  test("boş sorgu hepsini döner", () => {
    expect(searchNotes(notes, "")).toHaveLength(3);
    expect(searchNotes(notes, "   ")).toHaveLength(3);
  });

  test("başlıkta ve gövdede arar", () => {
    expect(searchNotes(notes, "market").map((n) => n.id)).toEqual(["a"]);
    expect(searchNotes(notes, "ekmek").map((n) => n.id)).toEqual(["a"]);
  });

  test("Türkçe büyük/küçük harf duyarsızdır", () => {
    expect(searchNotes(notes, "istanbul").map((n) => n.id)).toEqual(["b"]);
    expect(searchNotes(notes, "İSTANBUL").map((n) => n.id)).toEqual(["b"]);
  });

  test("aksansız yazım da bulur", () => {
    expect(searchNotes(notes, "sut").map((n) => n.id)).toEqual(["a"]);
    expect(searchNotes(notes, "yuzyillik").map((n) => n.id)).toEqual(["c"]);
  });

  test("birden çok kelime AND olarak aranır, bitişik olmaları gerekmez", () => {
    expect(searchNotes(notes, "market ekmek").map((n) => n.id)).toEqual(["a"]);
    expect(searchNotes(notes, "market kitap")).toEqual([]);
  });

  test("girdiyi değiştirmez", () => {
    const original = [...notes];
    searchNotes(notes, "market");
    expect(notes).toEqual(original);
  });
});

describe("sortNotes", () => {
  const notes = [
    note({ id: "eski", date: asDateStr("2026-08-01") }),
    note({ id: "yeni", date: asDateStr("2026-08-10") }),
    note({ id: "orta", date: asDateStr("2026-08-05") }),
  ];

  test("newest: yeniden eskiye", () => {
    expect(sortNotes(notes, "newest").map((n) => n.id)).toEqual([
      "yeni",
      "orta",
      "eski",
    ]);
  });

  test("oldest: eskiden yeniye", () => {
    expect(sortNotes(notes, "oldest").map((n) => n.id)).toEqual([
      "eski",
      "orta",
      "yeni",
    ]);
  });

  test("aynı gündeki notlar createdAt ile kararlı sıralanır", () => {
    const sameDay = [
      note({ id: "ikinci", createdAt: "2026-08-06T15:00:00Z" }),
      note({ id: "birinci", createdAt: "2026-08-06T09:00:00Z" }),
    ];
    expect(sortNotes(sameDay, "newest").map((n) => n.id)).toEqual([
      "ikinci",
      "birinci",
    ]);
    expect(sortNotes(sameDay, "oldest").map((n) => n.id)).toEqual([
      "birinci",
      "ikinci",
    ]);
  });

  test("girdiyi değiştirmez", () => {
    const original = notes.map((n) => n.id);
    sortNotes(notes, "oldest");
    expect(notes.map((n) => n.id)).toEqual(original);
  });
});

describe("groupByDate", () => {
  test("aynı günün notlarını tek öbekte toplar", () => {
    const sorted = sortNotes(
      [
        note({ id: "a", date: asDateStr("2026-08-10") }),
        note({ id: "b", date: asDateStr("2026-08-10") }),
        note({ id: "c", date: asDateStr("2026-08-01") }),
      ],
      "newest",
    );

    const groups = groupByDate(sorted);
    expect(groups).toHaveLength(2);
    expect(groups[0].date).toBe("2026-08-10");
    expect(groups[0].notes.map((n) => n.id)).toEqual(["a", "b"]);
    expect(groups[1].notes.map((n) => n.id)).toEqual(["c"]);
  });

  test("boş liste boş öbek döner", () => {
    expect(groupByDate([])).toEqual([]);
  });
});

describe("displayTitle", () => {
  test("başlık varsa onu kullanır", () => {
    expect(displayTitle(note({ id: "a", title: "Başlık", body: "gövde" }))).toBe(
      "Başlık",
    );
  });

  test("başlık yoksa gövdenin ilk satırını kullanır", () => {
    expect(
      displayTitle(note({ id: "a", title: null, body: "ilk satır\nikinci" })),
    ).toBe("ilk satır");
  });

  test("boşluk sadece başlık gövdeye düşer", () => {
    expect(displayTitle(note({ id: "a", title: "   ", body: "gövde" }))).toBe(
      "gövde",
    );
  });

  test("uzun ilk satır kısaltılır", () => {
    const long = "a".repeat(200);
    const result = displayTitle(note({ id: "a", body: long }), 20);
    expect(result).toHaveLength(21); // 20 karakter + tek karakterlik "…"
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("noteBody", () => {
  test("açık başlıklı notta gövdenin tamamını döner", () => {
    expect(
      noteBody(note({ id: "a", title: "Başlık", body: "ilk satır\nikinci" })),
    ).toBe("ilk satır\nikinci");
  });

  test("türetilmiş başlıklı tek satırlık notta boş döner", () => {
    // Açılacak bir şey yok: ilk satır zaten başlıkta.
    expect(noteBody(note({ id: "a", title: null, body: "tek satır" }))).toBe("");
  });

  test("türetilmiş başlıklı çok satırlı notta ilk satırdan sonrasını döner", () => {
    expect(
      noteBody(note({ id: "a", title: null, body: "ilk satır\nikinci\nüçüncü" })),
    ).toBe("ikinci\nüçüncü");
  });

  test("yalnızca boşluktan oluşan devam satırları boş sayılır", () => {
    expect(noteBody(note({ id: "a", title: null, body: "ilk satır\n   \n\n" }))).toBe(
      "",
    );
  });

  test("kırpılan türetilmiş başlıkta TAM ilk satır döner", () => {
    // `displayTitle` 20'yi aşınca "…" ile kırpar; kırpılan metnin
    // okunacak bir yeri kalmalı.
    const long = "a".repeat(50);
    expect(noteBody(note({ id: "a", title: null, body: long }), 20)).toBe(long);
  });

  test("kırpılan başlıkta sonraki satırlar da korunur", () => {
    const long = "a".repeat(50);
    expect(
      noteBody(note({ id: "a", title: null, body: `${long}\nikinci` }), 20),
    ).toBe(`${long}\nikinci`);
  });

  test("başlık ile gövde arasında metin ne kaybolur ne tekrarlanır", () => {
    // displayTitle + noteBody birlikte notun tamamını vermeli.
    const n = note({ id: "a", title: null, body: "ilk satır\nikinci" });
    expect(`${displayTitle(n)}\n${noteBody(n)}`).toBe("ilk satır\nikinci");
  });

  test("boşluk sadece başlık gövdeden türetilmiş sayılır", () => {
    expect(noteBody(note({ id: "a", title: "   ", body: "tek satır" }))).toBe("");
  });
});
