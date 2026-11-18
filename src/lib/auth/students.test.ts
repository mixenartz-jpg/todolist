import { describe, expect, it } from "vitest";
import { pickStudent, studentOptions, type ProfileRow } from "./students";

const COACH = "c0000000-0000-0000-0000-000000000000";

function row(over: Partial<ProfileRow>): ProfileRow {
  return {
    user_id: "u",
    role: "student",
    coach_id: COACH,
    display_name: null,
    created_at: "2026-11-01T10:00:00+00:00",
    ...over,
  };
}

describe("studentOptions", () => {
  it("yalnızca bu koçun öğrencileri, bağlanma sırasıyla", () => {
    const list = studentOptions(
      [
        row({ user_id: COACH, role: "coach", coach_id: null }),
        row({ user_id: "b", display_name: "Berk", created_at: "2026-11-05T00:00:00+00:00" }),
        row({ user_id: "a", display_name: "Ayşe", created_at: "2026-11-02T00:00:00+00:00" }),
        row({ user_id: "x", coach_id: "baska-koc" }),
      ],
      COACH,
    );
    expect(list).toEqual([
      { id: "a", name: "Ayşe" },
      { id: "b", name: "Berk" },
    ]);
  });

  it("aynı anda bağlananlar kimliğe göre sıralanır (veritabanıyla aynı)", () => {
    const list = studentOptions([row({ user_id: "b" }), row({ user_id: "a" })], COACH);
    expect(list.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("adı olmayan öğrenci sırasıyla adlandırılır", () => {
    const list = studentOptions(
      [row({ user_id: "a", display_name: "  " }), row({ user_id: "b", created_at: "2026-11-09T00:00:00+00:00" })],
      COACH,
    );
    expect(list.map((s) => s.name)).toEqual(["Öğrenci 1", "Öğrenci 2"]);
  });
});

describe("pickStudent", () => {
  const students = [
    { id: "a", name: "Ayşe" },
    { id: "b", name: "Berk" },
  ];

  it("çerezdeki öğrenci", () => {
    expect(pickStudent(students, "b")?.id).toBe("b");
  });

  it("çerez yok ya da artık benim öğrencim değil → ilk öğrenci", () => {
    expect(pickStudent(students, undefined)?.id).toBe("a");
    expect(pickStudent(students, "baskasinin")?.id).toBe("a");
  });

  it("öğrenci yoksa null", () => {
    expect(pickStudent([], "a")).toBeNull();
  });
});
