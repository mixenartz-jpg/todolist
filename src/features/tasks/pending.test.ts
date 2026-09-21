import { describe, expect, test } from "vitest";
import { isPendingTask, pendingTaskId } from "./pending";

describe("pendingTaskId", () => {
  test("her çağrıda farklı kimlik üretir", () => {
    expect(pendingTaskId()).not.toBe(pendingTaskId());
  });

  test("ürettiği kimlik bekleyen olarak tanınır", () => {
    expect(isPendingTask(pendingTaskId())).toBe(true);
  });
});

describe("isPendingTask", () => {
  test("sunucudan gelen UUID bekleyen DEĞİLDİR", () => {
    // Gerçek bir Supabase satırının kimliği bu biçimde gelir.
    expect(isPendingTask("3f2504e0-4f89-11d3-9a0c-0305e82c3301")).toBe(false);
  });

  test("boş dize bekleyen değildir", () => {
    expect(isPendingTask("")).toBe(false);
  });

  /*
   * Önek SADECE başta sayılır. Ortasında "tmp-" geçen bir kimlik
   * (teorik olarak mümkün) yanlışlıkla bekleyen sayılsaydı, gerçek bir
   * görev sessizce silinemez/işaretlenemez hâle gelirdi.
   */
  test("önek yalnızca başta tanınır", () => {
    expect(isPendingTask("abc-tmp-123")).toBe(false);
  });
});
