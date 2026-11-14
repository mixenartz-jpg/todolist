import { describe, expect, it } from "vitest";
import { roleFromClaims, routeFor } from "./roles";

describe("roleFromClaims", () => {
  it("app_metadata.role öğrenciyse öğrenci", () => {
    expect(roleFromClaims({ app_metadata: { role: "student" } })).toBe("student");
  });
  it("rol yoksa ya da bozuksa koç", () => {
    expect(roleFromClaims({})).toBe("coach");
    expect(roleFromClaims(null)).toBe("coach");
    expect(roleFromClaims({ app_metadata: { role: "admin" } })).toBe("coach");
  });
});

describe("routeFor", () => {
  it("kök role göre yönlenir", () => {
    expect(routeFor("coach", "/")).toBe("/koc/panel");
    expect(routeFor("student", "/")).toBe("/ogrenci/bugun");
  });
  it("öğrenci koç sayfalarına giremez", () => {
    expect(routeFor("student", "/koc/planlama")).toBe("/ogrenci/bugun");
    expect(routeFor("student", "/koc")).toBe("/ogrenci/bugun");
  });
  it("koç öğrenci ekranını önizleyebilir", () => {
    expect(routeFor("coach", "/ogrenci/bugun")).toBeNull();
  });
  it("izinli yollar geçer", () => {
    expect(routeFor("coach", "/koc/planlama")).toBeNull();
    expect(routeFor("student", "/ogrenci/gecmis")).toBeNull();
    expect(routeFor("student", "/kocluk")).toBeNull();
  });
});
