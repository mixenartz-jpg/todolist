import { describe, expect, it } from "vitest";
import type { Topic } from "@/features/sources/types";
import { matchTopic, topicKey } from "./match";

const t = (id: string, subject: string, exam: Topic["exam"], name: string, aliases: string[] = []): Topic => ({
  id, subject, exam, name, aliases, sortOrder: 0,
});
const TOPICS = [
  t("isik", "Fizik", "TYT", "Işık ve Gölge"),
  t("bhh", "Fizik", "AYT", "Basit Harmonik Hareket", ["BHH"]),
  t("uslu-tyt", "Matematik", "TYT", "Üslü Sayılar", ["Üslü İfadeler"]),
  t("uslu-lgs", "Matematik", "LGS", "Üslü İfadeler", ["Üslü Sayılar"]),
  t("ebob", "Matematik", "TYT", "EBOB - EKOK"),
];

describe("topicKey", () => {
  it("Türkçe duyarsız: 'Işık' = 'ışık' = 'ISIK'", () => {
    expect(topicKey("Işık")).toBe(topicKey("ışık"));
    expect(topicKey("IŞIK")).toBe(topicKey("ışık"));
    expect(topicKey("İşçi")).toBe("isci");
    expect(topicKey("EBOB - EKOK")).toBe(topicKey("ebob ekok"));
  });
});

describe("matchTopic", () => {
  it("ad, takma ad, büyük/küçük harf", () => {
    expect(matchTopic("IŞIK VE GÖLGE", TOPICS, { subject: "Fizik", exam: "TYT" })?.id).toBe("isik");
    expect(matchTopic("bhh", TOPICS, { subject: "Fizik", exam: "AYT" })?.id).toBe("bhh");
    expect(matchTopic("Ebob Ekok", TOPICS, { subject: "Matematik", exam: "TYT" })?.id).toBe("ebob");
  });
  it("sınav kapsamı: aynı ad farklı sınavda farklı konu", () => {
    expect(matchTopic("Üslü Sayılar", TOPICS, { subject: "Matematik", exam: "LGS" })?.id).toBe("uslu-lgs");
    expect(matchTopic("Üslü Sayılar", TOPICS, { subject: "Matematik", exam: "TYT" })?.id).toBe("uslu-tyt");
  });
  it("ders kapsamı ve eşleşmeyen", () => {
    expect(matchTopic("Basit Harmonik Hareket", TOPICS, { subject: "Matematik", exam: null })).toBeNull();
    expect(matchTopic("Basit Harmonik", TOPICS, { subject: "Fizik", exam: "AYT" })).toBeNull();
    expect(matchTopic("Basit Harmonik Hareket", TOPICS, { subject: null, exam: null })?.id).toBe("bhh");
    expect(matchTopic("  ", TOPICS, { subject: null, exam: null })).toBeNull();
  });
});
