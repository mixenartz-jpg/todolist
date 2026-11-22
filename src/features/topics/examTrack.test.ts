import { describe, expect, it } from "vitest";
import type { Topic } from "@/features/sources/types";
import { examsForTrack, topicsForTrack } from "./examTrack";

const T = (id: string, subject: string, exam: Topic["exam"]): Topic => ({ id, subject, exam, name: id, aliases: [], sortOrder: 0 });
const topics = [T("a", "Matematik", "TYT"), T("b", "Matematik", "AYT"), T("c", "Matematik", "LGS"), T("d", "Türkçe", "LGS")];

describe("topicsForTrack", () => {
  it("LGS → yalnızca LGS konuları", () => {
    expect(topicsForTrack(topics, "LGS").map((t) => t.id)).toEqual(["c", "d"]);
  });
  it("YKS → TYT + AYT", () => {
    expect(topicsForTrack(topics, "YKS").map((t) => t.id)).toEqual(["a", "b"]);
  });
  it("atanmadı → hepsi", () => {
    expect(topicsForTrack(topics, null)).toHaveLength(4);
    expect(examsForTrack(null)).toBeNull();
  });
});
