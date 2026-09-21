import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { task } from "@/features/testing/fixtures";
import { tasksForDay } from "@/features/tasks/queries";
import { orderForDay } from "@/features/tasks/dayorder";
import {
  openTaskCount,
  quickPanelTasks,
  shouldShowPanel,
} from "./panel";

const TODAY = asDateStr("2026-08-19");

describe("quickPanelTasks", () => {
  it("bugüne tarihlenenleri sıraya dizer", () => {
    const list = quickPanelTasks(
      [
        task({ id: "b", dueDate: TODAY, sortOrder: 1 }),
        task({ id: "a", dueDate: TODAY, sortOrder: 0 }),
      ],
      TODAY,
    );

    expect(list.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("tarihsiz işleri almaz", () => {
    const list = quickPanelTasks([task({ dueDate: null })], TODAY);

    expect(list).toHaveLength(0);
  });

  it("gelecek günün işini almaz", () => {
    const list = quickPanelTasks([task({ dueDate: "2026-08-20" })], TODAY);

    expect(list).toHaveLength(0);
  });

  it("geçmişten taşan AÇIK işi alır", () => {
    const list = quickPanelTasks(
      [task({ id: "dun", dueDate: "2026-08-18", done: false })],
      TODAY,
    );

    expect(list.map((t) => t.id)).toEqual(["dun"]);
  });

  it("geçmişte BİTMİŞ işi almaz", () => {
    const list = quickPanelTasks(
      [task({ dueDate: "2026-08-18", done: true })],
      TODAY,
    );

    expect(list).toHaveLength(0);
  });

  /*
   * INVARIANT: widget'ta görünen küme, Bugün ekranındakiyle AYNI
   * olmak zorunda. Ayrışırsa kullanıcı widget'ta gördüğü bir işi
   * Bugün'de bulamaz — ve hangisinin doğru olduğunu bilemez.
   */
  it("Bugün ekranıyla AYNI kümeyi ve sırayı verir", () => {
    const tasks = [
      task({ id: "c", dueDate: TODAY, sortOrder: 2 }),
      task({ id: "dun", dueDate: "2026-08-18", sortOrder: 0 }),
      task({ id: "a", dueDate: TODAY, sortOrder: 0 }),
      task({ id: "sonra", dueDate: "2026-09-01" }),
    ];

    expect(quickPanelTasks(tasks, TODAY).map((t) => t.id)).toEqual(
      orderForDay(tasksForDay(tasks, TODAY)).map((t) => t.id),
    );
  });
});

describe("openTaskCount", () => {
  it("yalnızca bitmemişleri sayar", () => {
    const count = openTaskCount(
      [
        task({ dueDate: TODAY, done: true }),
        task({ dueDate: TODAY, done: false }),
      ],
      TODAY,
    );

    expect(count).toBe(1);
  });

  it("hepsi bittiyse sıfırdır", () => {
    const count = openTaskCount([task({ dueDate: TODAY, done: true })], TODAY);

    expect(count).toBe(0);
  });
});

describe("shouldShowPanel", () => {
  /*
   * Sıfır yazan bir sayaç, her sayfanın köşesinde duran ve hiçbir şey
   * söylemeyen bir gürültü olurdu.
   */
  it("bugün hiç iş yoksa gösterilmez", () => {
    expect(shouldShowPanel([], TODAY)).toBe(false);
    expect(shouldShowPanel([task({ dueDate: null })], TODAY)).toBe(false);
  });

  /*
   * HEPSİ bitmiş olsa bile gösterilir: "5/5" bir başarı bildirimidir
   * ve kullanıcının günü kapattığını görmesi, sayacın kaybolmasından
   * daha bilgilendirici.
   */
  it("işler bitmiş olsa da gösterilir", () => {
    expect(
      shouldShowPanel([task({ dueDate: TODAY, done: true })], TODAY),
    ).toBe(true);
  });
});
