"use client";

import { useQuery } from "@tanstack/react-query";
import { asDateStr } from "@/lib/date/date";
import type { IsoWeekday } from "@/lib/date/types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { RoutineRow, RoutineScheduleRow } from "@/lib/db/database.types";
import { normalizeVersions } from "./schedule";
import type { RoutineWithSchedule, Schedule, ScheduleVersion } from "./types";

/**
 * Rutinler + tam program zaman çizelgesi, tek sorguda.
 *
 * İki tablo ayrı çekilip bellekte birleştirilir; toplam satır sayısı
 * onlarla ölçüldüğü için bu, gömülü JOIN'den daha basit ve okunabilir.
 */
export function useRoutines() {
  return useQuery({
    queryKey: qk.routines(),
    queryFn: fetchRoutines,
  });
}

async function fetchRoutines(): Promise<RoutineWithSchedule[]> {
  const supabase = createClient();

  const [routinesResult, schedulesResult] = await Promise.all([
    supabase
      .from("routines")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("routine_schedules")
      .select("*")
      .order("effective_from", { ascending: true }),
  ]);

  if (routinesResult.error) throw routinesResult.error;
  if (schedulesResult.error) throw schedulesResult.error;

  return joinRoutines(
    routinesResult.data as RoutineRow[],
    schedulesResult.data as RoutineScheduleRow[],
  );
}

/** Satırları bellek modeline dönüştürür. Saf — test edilebilir. */
export function joinRoutines(
  routines: readonly RoutineRow[],
  schedules: readonly RoutineScheduleRow[],
): RoutineWithSchedule[] {
  const byRoutine = new Map<string, ScheduleVersion[]>();

  for (const row of schedules) {
    const parsed = parseSchedule(row.schedule);
    if (parsed === null) continue; // bozuk satırı sessizce atla

    const list = byRoutine.get(row.routine_id) ?? [];
    list.push({
      effectiveFrom: asDateStr(row.effective_from),
      schedule: parsed,
    });
    byRoutine.set(row.routine_id, list);
  }

  return routines.map((r) => {
    const startDate = asDateStr(r.start_date);
    const versions = normalizeVersions(byRoutine.get(r.id) ?? []);

    return {
      id: r.id,
      name: r.name,
      icon: r.icon,
      colorSlot: r.color_slot,
      // Postgres numeric → string. Sınırda çevrilir.
      target: Number(r.target),
      unit: r.unit,
      startDate,
      archivedAt: r.archived_at ? asDateStr(r.archived_at.slice(0, 10)) : null,
      sortOrder: r.sort_order,
      // Program satırı hiç yoksa (olmamalı, trigger garanti eder)
      // "her gün" varsayılır ki rutin matriste görünmez olmasın.
      versions:
        versions.length > 0
          ? versions
          : [{ effectiveFrom: startDate, schedule: { kind: "daily" } }],
    };
  });
}

/** jsonb'den Schedule'a güvenli dönüşüm. Tanınmayan şekil → null. */
export function parseSchedule(raw: unknown): Schedule | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, unknown>;

  switch (s.kind) {
    case "daily":
      return { kind: "daily" };

    case "weekdays": {
      if (!Array.isArray(s.days)) return null;
      const days = s.days
        .map(Number)
        .filter((d): d is IsoWeekday => Number.isInteger(d) && d >= 1 && d <= 7);
      if (days.length === 0) return null;
      return { kind: "weekdays", days };
    }

    case "flexible": {
      const count = Number(s.count);
      const per = s.per;
      if (!Number.isFinite(count) || count < 1) return null;
      if (per !== "week" && per !== "month") return null;
      return { kind: "flexible", count, per };
    }

    default:
      return null;
  }
}
