"use client";

import { useQuery } from "@tanstack/react-query";
import type { ShoppingItemRow } from "@/lib/db/database.types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { ShoppingItem } from "./types";

/**
 * Tüm alınacaklar — TEK sorgu.
 *
 * `usePlanGoals`/`useWeekGoals`'un aksine ölçek başına bölünmez ve
 * bölünemez: bu kalemlerin tarihi yoktur. Bölünmemesi bir kayıp da
 * değil — hedefler yıllar boyunca birikir ama alışveriş listesi
 * doğal olarak kısa kalır; alınanlar silinerek eritilir.
 */
export function useShoppingItems() {
  return useQuery({
    queryKey: qk.shoppingItems(),
    queryFn: fetchShoppingItems,
  });
}

async function fetchShoppingItems(): Promise<ShoppingItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("shopping_items")
    .select("*")
    /*
     * Index ile aynı sıra (shopping_items_user_sort_idx).
     *
     * `completed_at`'e göre SIRALANMAZ — `fetchWeekGoals`'un aynı
     * gerekçesi: kullanıcı bir kalemi işaretlediğinde satır gözünün
     * önünde listenin dibine zıplasaydı, hangisini işaretlediğini
     * kaybederdi. Alınmışlık yalnızca görsel olarak (üstü çizili)
     * belli olur.
     */
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as ShoppingItemRow[]).map(toShoppingItem);
}

export function toShoppingItem(row: ShoppingItemRow): ShoppingItem {
  return {
    id: row.id,
    title: row.title,
    completedAt: row.completed_at,
    sortOrder: row.sort_order,
  };
}
