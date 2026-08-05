"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { DateStr } from "@/lib/date/types";
import type { CachedEntry } from "./queries";

export interface SetEntryVars {
  routineId: string;
  date: DateStr;
  /** 0 veya altı → kayıt silinir. */
  value: number;
}

const SET_ENTRY_KEY = ["setEntry"] as const;

/**
 * Bir günün değerini yazar — matrisin, Bugün ekranının ve takvim
 * detayının ortak mutasyonu.
 *
 * Hücrenin anında dolması ve TİTREMEMESİ için beş mekanizma:
 *
 * 1. `cancelQueries` — uçuştaki bir GET, optimistic yazmadan sonra
 *    inip hücreyi eski haline döndürebilir. Klasik titreme sebebi.
 *
 * 2. Tüm çakışan aralıkların yamalanması — matris ayı, Bugün günü ve
 *    istatistik yılı aynı tarihi kapsar; biri güncellenip diğeri
 *    kalırsa ekranlar arası tutarsızlık olur.
 *
 * 3. `onSettled`'da son mutasyon koruması — hızlı tıklamada her tık
 *    için değil, yalnızca sonuncusu bittiğinde bir kez yeniden çeker.
 *
 * 4. `value <= 0` satırı yazmak yerine siler — optimistic şekil ile
 *    sunucu şekli yapısal olarak aynı kalır.
 *
 * 5. Hata durumunda tam anlık görüntü geri yüklenir.
 */
export function useSetEntry(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: SET_ENTRY_KEY,

    mutationFn: async ({ routineId, date, value }: SetEntryVars) => {
      const supabase = createClient();

      if (value <= 0) {
        const { error } = await supabase
          .from("entries")
          .delete()
          .eq("routine_id", routineId)
          .eq("date", date);
        if (error) throw error;
        return;
      }

      const { error } = await supabase
        .from("entries")
        .upsert(
          { routine_id: routineId, date, value },
          { onConflict: "routine_id,date" },
        );
      if (error) throw error;
    },

    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: qk.entries() });

      const snapshots = qc.getQueriesData<CachedEntry[]>({
        queryKey: qk.entries(),
      });

      for (const [key, rows] of snapshots) {
        if (!rows) continue;
        qc.setQueryData<CachedEntry[]>(key, patchRows(rows, vars));
      }

      return { snapshots };
    },

    onError: (error, _vars, context) => {
      for (const [key, rows] of context?.snapshots ?? []) {
        qc.setQueryData(key as QueryKey, rows);
      }
      onError?.(
        error instanceof Error ? error.message : "Kaydedilemedi, tekrar deneyin",
      );
    },

    onSettled: () => {
      // Yalnızca son uçuştaki mutasyon bittiğinde yeniden çek.
      // Bu koruma olmadan beş hızlı tık beş yeniden çekme tetikler ve
      // grid gözle görülür şekilde titrer.
      if (qc.isMutating({ mutationKey: SET_ENTRY_KEY }) === 1) {
        qc.invalidateQueries({ queryKey: qk.entries() });
      }
    },

    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
  });
}

/**
 * Önbellek satırlarını yamalar. Saf fonksiyon — mevcut diziyi
 * değiştirmez, yenisini döndürür.
 *
 * Aralık dışındaki tarihler dokunulmadan bırakılır: her önbellek
 * girdisi kendi tarih penceresine sahiptir ve o pencerede olmayan bir
 * tarih oraya eklenmemelidir.
 */
export function patchRows(
  rows: readonly CachedEntry[],
  vars: SetEntryVars,
): CachedEntry[] {
  const index = rows.findIndex(
    (r) => r.routine_id === vars.routineId && r.date === vars.date,
  );

  if (vars.value <= 0) {
    return index === -1 ? [...rows] : rows.filter((_, i) => i !== index);
  }

  if (index === -1) {
    return [
      ...rows,
      { routine_id: vars.routineId, date: vars.date, value: vars.value },
    ];
  }

  const next = [...rows];
  next[index] = { ...next[index], value: vars.value };
  return next;
}
