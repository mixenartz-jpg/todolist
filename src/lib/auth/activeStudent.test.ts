import { afterEach, describe, expect, it } from "vitest";
import { forActiveOwner, forActiveStudent, setActiveStudentId } from "./activeStudent";

/** Postgrest kurucusunun sahtesi: çağrılan süzgeçleri kaydeder. */
function fakeQuery() {
  const calls: string[] = [];
  const q = {
    calls,
    eq(column: string, value: string) {
      calls.push(`eq ${column} ${value}`);
      return q;
    },
    is(column: string, value: null) {
      calls.push(`is ${column} ${value}`);
      return q;
    },
  };
  return q;
}

afterEach(() => setActiveStudentId(null));

describe("forActiveStudent", () => {
  it("seçili öğrenciye daraltır", () => {
    setActiveStudentId("a");
    expect(forActiveStudent(fakeQuery()).calls).toEqual(["eq student_id a"]);
  });

  it("öğrenci yoksa öğrencisiz satırlar", () => {
    expect(forActiveStudent(fakeQuery()).calls).toEqual(["is student_id null"]);
  });
});

describe("forActiveOwner", () => {
  it("seçili öğrenci varsa sahip sütununa daraltır", () => {
    setActiveStudentId("b");
    expect(forActiveOwner(fakeQuery(), "user_id").calls).toEqual(["eq user_id b"]);
  });

  it("öğrenci yoksa süzmez", () => {
    expect(forActiveOwner(fakeQuery(), "user_id").calls).toEqual([]);
  });
});
