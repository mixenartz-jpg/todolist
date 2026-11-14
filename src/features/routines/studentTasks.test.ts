import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { routine } from "@/features/testing/fixtures";
import { routineTasksToCreate } from "./studentTasks";

const from = asDateStr("2026-11-16"); // Pazartesi
const to = asDateStr("2026-11-22"); // Pazar

describe("öğrenci rutini → görev", () => {
  const daily = routine({ id: "d", studentId: "s", startDate: "2026-11-01" });
  const mw = routine({ id: "mw", studentId: "s", startDate: "2026-11-01", schedule: { kind: "weekdays", days: [1, 3] } });
  const flex = routine({ id: "f", studentId: "s", startDate: "2026-11-01", schedule: { kind: "flexible", count: 2, per: "week" } });
  const mine = routine({ id: "m", studentId: null, startDate: "2026-11-01" });

  it("her gün ve seçili hafta günleri; esnek ve koçun kendi rutini görev üretmez", () => {
    const req = routineTasksToCreate([daily, mw, flex, mine], [], from, to);
    expect(req.filter((r) => r.routineId === "d")).toHaveLength(7);
    expect(req.filter((r) => r.routineId === "mw").map((r) => r.dueDate)).toEqual(["2026-11-16", "2026-11-18"]);
    expect(req.some((r) => r.routineId === "f" || r.routineId === "m")).toBe(false);
  });

  it("idempotent: mevcut görev olan gün tekrar istenmez; ikinci tur boş", () => {
    const first = routineTasksToCreate([daily, mw], [], from, to);
    const created = first.map((r) => ({ routineId: r.routineId, dueDate: r.dueDate }));
    expect(routineTasksToCreate([daily, mw], created, from, to)).toEqual([]);
    // Yarısı var → yalnızca eksikler.
    expect(routineTasksToCreate([daily], created.slice(0, 3), from, to)).toHaveLength(4);
  });

  it("başlangıç, bitiş ve arşiv sınırları", () => {
    const late = routine({ id: "l", studentId: "s", startDate: "2026-11-20" });
    const ended = routine({ id: "e", studentId: "s", startDate: "2026-11-01", endDate: "2026-11-17" });
    const archived = routine({ id: "a", studentId: "s", startDate: "2026-11-01", archivedAt: "2026-11-19" });
    const req = routineTasksToCreate([late, ended, archived], [], from, to);
    expect(req.filter((r) => r.routineId === "l").map((r) => r.dueDate)).toEqual(["2026-11-20", "2026-11-21", "2026-11-22"]);
    expect(req.filter((r) => r.routineId === "e").map((r) => r.dueDate)).toEqual(["2026-11-16", "2026-11-17"]);
    expect(req.filter((r) => r.routineId === "a").map((r) => r.dueDate)).toEqual(["2026-11-16", "2026-11-17", "2026-11-18"]);
  });
});

describe("öğrenci rutinleri alışkanlık takibine karışmaz", () => {
  it("useRoutines süzgeci yalnızca koçun kendi rutinlerini verir (entries/seri bunlarla yazılır)", async () => {
    const { personalRoutines, studentRoutines } = await import("./queries");
    const list = [routine({ id: "kendi" }), routine({ id: "ogr", studentId: "s" })];
    expect(personalRoutines(list).map((r) => r.id)).toEqual(["kendi"]);
    expect(studentRoutines(list).map((r) => r.id)).toEqual(["ogr"]);
  });
});
