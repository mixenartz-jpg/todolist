"use client";

import { useQuery } from "@tanstack/react-query";
import { asDateStr } from "@/lib/date/date";
import type {
  CategoryRow,
  MonthPlanRow,
  PlanGoalRow,
} from "@/lib/db/database.types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { DateStr } from "@/lib/date/types";
import type { Category, MonthPlan, PlanGoal } from "./types";

/**
 * Tüm kategoriler — arşivlenmişler DAHİL.
 *
 * Arşivlenmişler neden çekiliyor? Geçmiş görevlerin rengi ve adı hâlâ
 * çizilmeli; arşiv yalnızca SEÇİM listesinden çıkarma kararıdır ve o
 * filtre kullanım yerinde (`activeCategories`) uygulanır. Sunucu
 * tarafında ayırsaydık, arşivli bir kategorinin görevini gösteren her
 * ekran ikinci bir sorgu açmak zorunda kalırdı.
 */
export function useCategories() {
  return useQuery({
    queryKey: qk.categories(),
    queryFn: fetchCategories,
  });
}

async function fetchCategories(): Promise<Category[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    // Index ile aynı sıra: arşivlenmemişler önce, sonra kullanıcının
    // verdiği sıra (categories_user_sort_idx).
    .order("archived_at", { ascending: true, nullsFirst: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as CategoryRow[]).map(toCategory);
}

export function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    colorSlot: row.color_slot,
    sortOrder: row.sort_order,
    archivedAt: row.archived_at,
  };
}

/** Seçim listelerinde gösterilecekler — arşivlenmişler hariç. */
export function activeCategories(
  categories: readonly Category[],
): Category[] {
  return categories.filter((c) => c.archivedAt === null);
}

/** Kimlikten kategoriye hızlı erişim — satır başına arama yapmamak için. */
export function categoryMap(
  categories: readonly Category[],
): Map<string, Category> {
  return new Map(categories.map((c) => [c.id, c]));
}

/**
 * Bir ayın hedefleri.
 *
 * `tasks` gibi "hepsini çek" YAPILMAZ: hedefler yıllar boyunca birikir
 * ama ekran hep tek ay okur. Ay başına anahtar, geçmişe bakan
 * kullanıcıya da yalnızca baktığı ayı getirir.
 */
export function usePlanGoals(month: DateStr) {
  return useQuery({
    queryKey: qk.planGoalsMonth(month),
    queryFn: () => fetchPlanGoals(month),
  });
}

async function fetchPlanGoals(month: DateStr): Promise<PlanGoal[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("plan_goals")
    .select("*")
    .eq("month", month)
    .order("archived_at", { ascending: true, nullsFirst: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as PlanGoalRow[]).map(toPlanGoal);
}

export function toPlanGoal(row: PlanGoalRow): PlanGoal {
  return {
    id: row.id,
    // supabase-js `date`'i 'YYYY-MM-DD' string döndürür; DB kısıtı
    // değerin ayın 1'i olduğunu garanti eder.
    month: asDateStr(row.month),
    title: row.title,
    note: row.note,
    targetCount: row.target_count,
    doneCount: row.done_count,
    colorSlot: row.color_slot,
    sortOrder: row.sort_order,
    archivedAt: row.archived_at,
  };
}

/**
 * Ayın GENEL planı.
 *
 * `usePlanGoals` ile aynı çapayı okur ama tek satır döner — ikisi
 * ayrı sorgudur çünkü ayrı tablolardır ve biri değişince ötekinin
 * tazelenmesi gerekmez.
 */
export function useMonthPlan(month: DateStr) {
  return useQuery({
    queryKey: qk.monthPlan(month),
    queryFn: () => fetchMonthPlan(month),
  });
}

/**
 * Satır YOKSA `null` değil, boş gövdeli bir `MonthPlan` döner.
 *
 * Gerekçe editörde: `MonthPlanEditor` "sunucu verisi geldi mi" sorusunu
 * `data !== undefined` ile soruyor (DayPlanEditor'ın senkron guard'ı).
 * `null` dönseydi "satır yok" ile "henüz yüklenmedi" ayırt edilemez,
 * guard hiç tetiklenmez ve ay değiştirince alan eski metinde takılı
 * kalırdı. Boş gövde, var olmayan satırın doğru temsilidir.
 *
 * `maybeSingle()` — `single()` DEĞİL: `single()` satır yokken HATA
 * fırlatır ve planı henüz yazılmamış her ay bir hata ekranı olurdu.
 */
async function fetchMonthPlan(month: DateStr): Promise<MonthPlan> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("month_plans")
    .select("*")
    .eq("month", month)
    .maybeSingle();

  if (error) throw error;
  if (data === null) return { month, body: "" };

  return toMonthPlan(data as MonthPlanRow);
}

export function toMonthPlan(row: MonthPlanRow): MonthPlan {
  return {
    // supabase-js `date`'i 'YYYY-MM-DD' string döndürür; DB kısıtı
    // değerin ayın 1'i olduğunu garanti eder (toPlanGoal ile aynı).
    month: asDateStr(row.month),
    body: row.body,
  };
}

/**
 * Ayın hangi günlerinde plan YAZILI?
 *
 * Yalnızca tarih sütunu çekilir; ızgara hücresi metni değil, bir NOKTA
 * çiziyor ve 42 günün plan metnini indirmek boşuna bant genişliği
 * olurdu. Gün paneli açıldığında asıl metin `qk.note(date)` ile gelir.
 */
export function useMonthPlanDays(from: DateStr, to: DateStr, month: DateStr) {
  return useQuery({
    queryKey: qk.notePlansMonth(month),
    queryFn: () => fetchMonthPlanDays(from, to),
  });
}

async function fetchMonthPlanDays(
  from: DateStr,
  to: DateStr,
): Promise<Set<DateStr>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("day_notes")
    .select("date")
    .gte("date", from)
    .lte("date", to)
    .not("plan", "is", null);

  if (error) throw error;

  /*
   * Boş/yalnızca boşluk plan yazılmış satırlar da gelebilir: kullanıcı
   * metni silince mutation `null` yazıyor ama eski satırlar için
   * garanti yok. Filtre `dayplan.ts`'in `hasPlan` kuralıyla aynı
   * olmalı, yoksa hücrede nokta görünür ama panel boş açılır.
   */
  return new Set(
    (data as Array<{ date: string }>).map((r) => asDateStr(r.date)),
  );
}
