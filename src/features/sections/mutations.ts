"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { SectionKey } from "@/lib/ui/sections";

interface SetLabelVars {
  key: SectionKey;
  /** null → satır silinir ve başlık varsayılana döner. */
  label: string | null;
}

/**
 * Bir bölümün adını değiştirir — optimistic.
 *
 * ── Neden optimistic? ──
 * Enter'a bastıktan sonra başlığın eski adında kalıp bir tur sonra
 * değişmesi, düzenlemenin işlemediği izlenimi verir ve kullanıcıyı
 * ikinci kez denemeye iter. Yazma işlemi bir kutucuk dokunuşu kadar
 * küçüktür; beklemeyi hak etmez.
 *
 * ── Neden boşta SİLME, boş string yazma değil? ──
 * "Varsayılana dön" tek bir durumdur ve satırın yokluğuyla ifade
 * edilir. Boş string'i saklamak, okuma tarafında "boş mu, yoksa hiç
 * yazılmamış mı" ayrımını her kullanım yerine yayardı — üstelik SQL
 * kısıtı boş etiketi zaten reddediyor (0007).
 */
export function useSetSectionLabel(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, label }: SetLabelVars) => {
      const supabase = createClient();

      if (label === null) {
        const { error } = await supabase
          .from("section_labels")
          .delete()
          .eq("key", key);
        if (error) throw error;
        return;
      }

      // `user_id` GÖNDERİLMEZ; trigger oturumdan damgalar. Çakışma
      // hedefi yine de user_id'yi içerir: birincil anahtar odur ve
      // RLS zaten başka bir kullanıcının satırını görünmez kılar.
      // (`useSaveDayNote` ile birebir aynı kalıp.)
      const { error } = await supabase
        .from("section_labels")
        .upsert({ key, label }, { onConflict: "user_id,key" });
      if (error) throw error;
    },

    onMutate: async ({ key, label }) => {
      await qc.cancelQueries({ queryKey: qk.sectionLabels() });
      const previous = qc.getQueryData<ReadonlyMap<string, string>>(
        qk.sectionLabels(),
      );

      // Haritayı KOPYALA: yerinde değiştirmek referansı aynı bırakır,
      // React değişikliği göremez ve geri alma da imkânsızlaşır.
      const next = new Map(previous ?? []);
      if (label === null) next.delete(key);
      else next.set(key, label);

      qc.setQueryData(qk.sectionLabels(), next);

      return { previous };
    },

    onError: (error, _vars, context) => {
      qc.setQueryData(qk.sectionLabels(), context?.previous);
      onError?.(
        error instanceof Error ? error.message : "Başlık kaydedilemedi",
      );
    },

    onSettled: () => qc.invalidateQueries({ queryKey: qk.sectionLabels() }),
  });
}
