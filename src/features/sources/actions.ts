import { normalize } from "@/lib/text/normalize";
import type { Task } from "@/features/tasks/types";
import type { SourceKind } from "./types";

/*
 * Görev eylemleri. Varsayılanlar kodda; koç `task_actions` tablosuna
 * kendi eylemini ekler. Öğrencinin sonuç formu eyleme göre değişir.
 */

export const DEFAULT_ACTIONS = ["Çöz", "Çöz + Analiz", "İzle", "İzle + Feynman", "Tekrar", "İlerlet"] as const;

export const PROGRESS_ACTION = "İlerlet";

export function defaultAction(kind: SourceKind): string {
  return kind === "video" ? "İzle + Feynman" : "Çöz + Analiz";
}

/** Varsayılanlar + koçun eylemleri, tekrarsız (Türkçe duyarsız). */
export function allActions(custom: readonly string[]): string[] {
  const out: string[] = [...DEFAULT_ACTIONS];
  for (const c of custom) {
    const label = c.trim();
    if (label && !out.some((a) => normalize(a) === normalize(label))) out.push(label);
  }
  return out;
}

/**
 * Sonuç formunun biçimi:
 *   solve     durum, T/D/Y/B, net, süre, eksik konular, not
 *   watch     durum, süre, anlama, Feynman notu, not
 *   progress  durum, bitiş noktası (zorunlu), süre, ops. D/Y, not
 *   routine   durum, süre, not; soru içeren rutinde ops. D/Y
 */
export type ResultFormKind = "solve" | "watch" | "progress" | "routine";

export function resultFormKind(task: Pick<Task, "action" | "routineId" | "title" | "targetAmount">): ResultFormKind {
  if (task.routineId || /^\s*rutin\b/i.test(normalize(task.title))) return "routine";
  const action = normalize(task.action ?? "");
  if (task.targetAmount != null || action.includes("ilerlet")) return "progress";
  if (action.includes("izle")) return "watch";
  return "solve";
}

/** Feynman notu istenir mi (İzle + Feynman). */
export function wantsFeynman(task: Pick<Task, "action" | "title">): boolean {
  return normalize(`${task.action ?? ""} ${task.title}`).includes("feynman");
}

export const UNDERSTANDING_LABELS = ["Anlamadım", "Kısmen", "Anladım"] as const;
