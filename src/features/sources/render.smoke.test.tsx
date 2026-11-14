import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TaskResultForm } from "@/features/day/TaskResultForm";
import { emptyResult } from "@/features/results/mutations";
import { asDateStr } from "@/lib/date/date";
import { SourceForm } from "./SourceForm";
import { RangeBar, TestGrid } from "./UnitGrid";
import { sectionUnitStates } from "./unitStatus";
import type { SourceTree } from "./types";

/*
 * Duman testi: bileşenler sunucu render'ında hata vermeden çiziliyor
 * mu ve eyleme göre doğru alanlar çıkıyor mu. Etkileşim testi değil.
 */

const draft = { ...emptyResult("t", asDateStr("2026-11-14")), status: "partial" as const };
const noop = () => {};

function form(kind: "solve" | "watch" | "progress" | "routine", extra = {}) {
  return renderToString(
    <TaskResultForm
      draft={draft}
      update={noop}
      flush={noop}
      status="idle"
      questionTask
      disabled={false}
      kind={kind}
      {...extra}
    />,
  );
}

describe("sonuç formu eyleme göre", () => {
  it("Çöz: T/D/Y/B ve eksik konular", () => {
    const html = form("solve");
    expect(html).toContain("Toplam");
    expect(html).toContain("Eksik / takıldığım konular");
    expect(html).not.toContain("Anlama");
  });
  it("İzle + Feynman: anlama ve Feynman notu; soru yok", () => {
    const html = form("watch", { feynman: true });
    expect(html).toContain("Anladım");
    expect(html).toContain("Feynman notu");
    expect(html).not.toContain("Toplam");
  });
  it("İlerlet: zorunlu bitiş noktası, ops. D/Y", () => {
    const html = form("progress", { progress: { start: 126, unit: "sayfa" } });
    expect(html).toContain("Bitiş noktası");
    expect(html).toContain("Zorunlu");
    expect(html).not.toContain("Toplam");
  });
  it("yarım kalan çok testli görevde test seçimi", () => {
    const html = form("solve", { items: [{ id: "a", number: 39 }, { id: "b", number: 40 }] });
    expect(html).toContain("Hangi testleri yaptın?");
  });
});

describe("katalog bileşenleri", () => {
  const states = sectionUnitStates({ from: 1, to: 5, links: [], marks: [] });
  it("kutucuk ızgarası ve aralık çubuğu", () => {
    expect(renderToString(<TestGrid states={states} onPick={noop} draggableFree />)).toContain('data-unit="3"');
    expect(renderToString(<RangeBar states={states} unitLabel="sayfa" />)).toContain("boş");
  });

  it("kaynak formu mevcut ağacı içindekiler metnine çevirir", () => {
    const tree: SourceTree = {
      id: "s", title: "BilgiSarmal", subject: "Fizik", exam: "AYT", kind: "kitap", publisher: null, level: null,
      unit: "test", minutesPerUnit: 20, status: "devam", totalTests: 8, studentId: null, aliases: [], sortOrder: 0,
      archivedAt: null,
      series: [{ id: "se", sourceId: "s", name: "Sarmal", kind: "sarmal", sortOrder: 0, sections: [
        { id: "sc", seriesId: "se", topicId: null, label: "Sarmal", unitFrom: 1, unitTo: 8, sortOrder: 0, items: [] },
      ] }, { id: "k", sourceId: "s", name: "Konu Testleri", kind: "konu", sortOrder: 1, sections: [
        { id: "k1", seriesId: "k", topicId: null, label: "Dalga", unitFrom: 1, unitTo: 4, sortOrder: 0, items: [] },
      ] }],
    };
    const html = renderToString(
      <QueryClientProvider client={new QueryClient()}>
        <SourceForm
          initial={tree}
          topics={[]}
          pending={false}
          linkedItemIds={new Set()}
          linkedSectionIds={new Set()}
          onSave={noop}
          onCancel={noop}
        />
      </QueryClientProvider>,
    );
    expect(html).toContain("# Sarmal | 1-8");
    expect(html).toContain("Dalga | 1-4");
    expect(html).toContain("yeni konu");
  });
});
