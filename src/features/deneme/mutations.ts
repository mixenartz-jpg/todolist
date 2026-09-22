"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DenemeDersRow, DenemeRow } from "@/lib/db/database.types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import { toDeneme, toDenemeDers } from "./queries";
import type {
  Deneme,
  DenemeDers,
  DenemeDersDraft,
  DenemeDetayli,
  DenemeDraft,
} from "./types";

/**
 * Yeni deneme + ders satırları.
 *
 * ── Optimistic DEĞİL ──
 * `useCreateWeekGoal`/`useCreateShoppingItem` ile aynı gerekçe:
 * kimliği sunucu üretiyor. Ama burada bir gerekçe daha var — bu
 * mutation İKİ tabloya yazıyor ve iyimser bir satır, ders satırları
 * henüz var olmadan listeye "0.00 net" diye düşerdi. Kullanıcının
 * az önce girdiği 86 net yerine sıfır görmesi, en kötü türden
 * iyimserlik olurdu.
 *
 * ── İki yazma, tek sonuç ──
 * Deneme eklenir, sonra ders satırları. İkincisi başarısız olursa
 * deneme SİLİNİR (aşağıda): yarım kalmış bir kayıt bırakmak,
 * kullanıcının elle temizlemesi gereken bir hayalet demekti.
 * Gerçek bir transaction değil — Supabase istemcisi bunu vermez —
 * ama gözlemlenebilir sonucu aynı: ya ikisi de olur ya hiçbiri.
 */
export function useCreateDeneme(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: createDeneme,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.denemeler() }),
    onError: (error) => onError?.(errorText(error)),
  });
}

async function createDeneme(draft: DenemeDraft): Promise<Deneme> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("denemeler")
    .insert({
      // Ad çağıran tarafta kırpılıyor; buradaki `trim` son savunma
      // (0018'in check kısıtı boş adı reddeder).
      ad: draft.ad.trim(),
      tur: draft.tur,
      alan: draft.alan,
      tarih: draft.tarih,
      sure_dk: draft.sureDk,
      note: draft.note,
    })
    .select()
    .single();

  if (error) throw error;
  const deneme = toDeneme(data as DenemeRow);

  if (draft.dersler.length === 0) return deneme;

  const { error: dersError } = await supabase
    .from("deneme_dersleri")
    .insert(draft.dersler.map((d) => dersInsert(deneme.id, d)));

  if (dersError) {
    /*
     * Geri alma. `await` EDİLİYOR ama sonucu YUTULUYOR: silme de
     * başarısız olursa kullanıcıya gösterilecek doğru hata hâlâ
     * ders satırlarının hatasıdır — asıl sebep o. Silme hatasını
     * öne çıkarmak, "neden kaydedemedim" sorusunu "neden
     * silemedim"e çevirirdi.
     *
     * Silme başarısız olursa ekranda derssiz bir deneme kalır; bu
     * görünür ve kullanıcının silebileceği bir durum, sessiz bir
     * bozulma değil.
     */
    await supabase
      .from("denemeler")
      .delete()
      .eq("id", deneme.id)
      .then(undefined, () => undefined);

    throw dersError;
  }

  return deneme;
}

/** Ders taslağını satır şekline çevirir. Insert ve update ortak kullanır. */
function dersInsert(denemeId: string, d: DenemeDersDraft) {
  return {
    deneme_id: denemeId,
    ders: d.ders.trim(),
    dogru: d.dogru,
    yanlis: d.yanlis,
    bos: d.bos,
    soru_sayisi: d.soruSayisi,
    hedef_net: d.hedefNet,
    sort_order: d.sortOrder,
  };
}

/**
 * Denemenin üst bilgilerini günceller (ad, tarih, süre, not).
 *
 * Ders satırlarına DOKUNMAZ — onların kendi mutation'ı var
 * (`useUpdateDenemeDers`). Ayrılmalarının sebebi kullanım biçimi:
 * adı düzeltmek tek bir yazma, ders satırı düzenlemek ise hücre
 * hücre ilerleyen bir iş. Tek mutation olsaydı her hücre
 * değişikliğinde denemenin tamamı yeniden yazılırdı.
 *
 * Optimistic: kullanıcı yazdığı adı anında görmeli.
 */
export function useUpdateDeneme(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<Deneme, "ad" | "tarih" | "sureDk" | "note">>;
    }) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("denemeler")
        .update({
          ...(patch.ad !== undefined && { ad: patch.ad.trim() }),
          ...(patch.tarih !== undefined && { tarih: patch.tarih }),
          ...(patch.sureDk !== undefined && { sure_dk: patch.sureDk }),
          ...(patch.note !== undefined && { note: patch.note }),
        })
        .eq("id", id);

      if (error) throw error;
    },

    onMutate: async (vars) => {
      /*
       * İKİ önbellek yamanır: detay ve liste. Aynı denemenin adı iki
       * yerde çizili ve yalnız biri güncellenseydi, geri dönünce eski
       * ad görünürdü — `qk.deneme` önekinin `qk.denemeler` altında
       * olması geçersiz kılmayı halleder ama İYİMSER yamayı etmez.
       */
      const detayKey = qk.deneme(vars.id);
      const listeKey = qk.denemeler();
      await Promise.all([
        qc.cancelQueries({ queryKey: detayKey }),
        qc.cancelQueries({ queryKey: listeKey }),
      ]);

      const previousDetay = qc.getQueryData<DenemeDetayli>(detayKey);
      const previousListe = qc.getQueryData<DenemeDetayli[]>(listeKey);

      const yama = (d: DenemeDetayli): DenemeDetayli => ({
        ...d,
        ...(vars.patch.ad !== undefined && { ad: vars.patch.ad }),
        ...(vars.patch.tarih !== undefined && { tarih: vars.patch.tarih }),
        ...(vars.patch.sureDk !== undefined && { sureDk: vars.patch.sureDk }),
        ...(vars.patch.note !== undefined && { note: vars.patch.note }),
      });

      qc.setQueryData<DenemeDetayli>(detayKey, (d) => (d ? yama(d) : d));
      qc.setQueryData<DenemeDetayli[]>(listeKey, (list) =>
        list?.map((d) => (d.id === vars.id ? yama(d) : d)),
      );

      return { previousDetay, previousListe, detayKey, listeKey };
    },

    onError: (error, _vars, context) => {
      if (context) {
        qc.setQueryData(context.detayKey, context.previousDetay);
        qc.setQueryData(context.listeKey, context.previousListe);
      }
      onError?.(errorText(error));
    },

    /*
     * Tek geçersiz kılma iki anahtarı da kapsıyor: `qk.deneme(id)`
     * listenin önekinin ALTINDA (bkz. keys.ts). Ayrı ayrı çağırmak
     * aynı işi iki kez yapardı.
     */
    onSettled: () => qc.invalidateQueries({ queryKey: qk.denemeler() }),
  });
}

/**
 * Tek ders satırının sayılarını günceller — optimistic.
 *
 * İyimserlik burada ŞART, süs değil: net her tuş vuruşunda yeniden
 * çiziliyor. Sunucu yanıtı beklenseydi kullanıcı yazdığı sayının
 * nete yansımasını gecikmeli görür ve uygulamayı ağır sanırdı.
 */
export function useUpdateDenemeDers(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      denemeId: string;
      patch: Partial<
        Pick<
          DenemeDers,
          "ders" | "dogru" | "yanlis" | "bos" | "soruSayisi" | "hedefNet"
        >
      >;
    }) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("deneme_dersleri")
        .update({
          ...(patch.ders !== undefined && { ders: patch.ders.trim() }),
          ...(patch.dogru !== undefined && { dogru: patch.dogru }),
          ...(patch.yanlis !== undefined && { yanlis: patch.yanlis }),
          ...(patch.bos !== undefined && { bos: patch.bos }),
          ...(patch.soruSayisi !== undefined && {
            soru_sayisi: patch.soruSayisi,
          }),
          ...(patch.hedefNet !== undefined && { hedef_net: patch.hedefNet }),
        })
        .eq("id", id);

      if (error) throw error;
    },

    onMutate: async (vars) => {
      const detayKey = qk.deneme(vars.denemeId);
      const listeKey = qk.denemeler();
      await Promise.all([
        qc.cancelQueries({ queryKey: detayKey }),
        qc.cancelQueries({ queryKey: listeKey }),
      ]);

      const previousDetay = qc.getQueryData<DenemeDetayli>(detayKey);
      const previousListe = qc.getQueryData<DenemeDetayli[]>(listeKey);

      const yamaDersler = (d: DenemeDetayli): DenemeDetayli => ({
        ...d,
        dersler: d.dersler.map((ders) =>
          ders.id === vars.id ? { ...ders, ...vars.patch } : ders,
        ),
      });

      qc.setQueryData<DenemeDetayli>(detayKey, (d) => (d ? yamaDersler(d) : d));
      qc.setQueryData<DenemeDetayli[]>(listeKey, (list) =>
        list?.map((d) => (d.id === vars.denemeId ? yamaDersler(d) : d)),
      );

      return { previousDetay, previousListe, detayKey, listeKey };
    },

    onError: (error, _vars, context) => {
      if (context) {
        qc.setQueryData(context.detayKey, context.previousDetay);
        qc.setQueryData(context.listeKey, context.previousListe);
      }
      onError?.(errorText(error));
    },

    onSettled: () => qc.invalidateQueries({ queryKey: qk.denemeler() }),
  });
}

/**
 * Denemeyi siler — optimistic.
 *
 * Ders satırları ve yanlışları `on delete cascade` ile birlikte gider
 * (0018/0019). Görsel DOSYALARI gitmez: storage nesneleri satır
 * silmeyi izlemez. Bu bilinen bir borç ve yetim dosyalar özel
 * bucket'ta erişilemez durumda kalır — veri sızıntısı değil, yalnızca
 * yer kaplama.
 */
export function useDeleteDeneme(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("denemeler").delete().eq("id", id);
      if (error) throw error;
    },

    onMutate: async (id) => {
      const key = qk.denemeler();
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<DenemeDetayli[]>(key);

      qc.setQueryData<DenemeDetayli[]>(key, (list) =>
        list?.filter((d) => d.id !== id),
      );

      return { previous, key };
    },

    onError: (error, _id, context) => {
      if (context) qc.setQueryData(context.key, context.previous);
      onError?.(errorText(error));
    },

    onSettled: () => qc.invalidateQueries({ queryKey: qk.denemeler() }),
  });
}

/**
 * Denemeye yeni bir ders satırı ekler.
 *
 * Branş denemesinde şablon boş gelir (bkz. `derslerIcin`) ve satırı
 * kullanıcı ekler; TYT'de de "bu denemede Coğrafya'yı ayrı sayayım"
 * meşru bir istek.
 */
export function useCreateDenemeDers(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      denemeId,
      draft,
    }: {
      denemeId: string;
      draft: DenemeDersDraft;
    }) => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("deneme_dersleri")
        .insert(dersInsert(denemeId, draft))
        .select()
        .single();

      if (error) throw error;
      return toDenemeDers(data as DenemeDersRow);
    },

    onSuccess: () => qc.invalidateQueries({ queryKey: qk.denemeler() }),
    onError: (error) => onError?.(errorText(error)),
  });
}

/** Ders satırını siler — optimistic. */
export function useDeleteDenemeDers(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; denemeId: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("deneme_dersleri")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },

    onMutate: async (vars) => {
      const detayKey = qk.deneme(vars.denemeId);
      const listeKey = qk.denemeler();
      await Promise.all([
        qc.cancelQueries({ queryKey: detayKey }),
        qc.cancelQueries({ queryKey: listeKey }),
      ]);

      const previousDetay = qc.getQueryData<DenemeDetayli>(detayKey);
      const previousListe = qc.getQueryData<DenemeDetayli[]>(listeKey);

      const sil = (d: DenemeDetayli): DenemeDetayli => ({
        ...d,
        dersler: d.dersler.filter((ders) => ders.id !== vars.id),
      });

      qc.setQueryData<DenemeDetayli>(detayKey, (d) => (d ? sil(d) : d));
      qc.setQueryData<DenemeDetayli[]>(listeKey, (list) =>
        list?.map((d) => (d.id === vars.denemeId ? sil(d) : d)),
      );

      return { previousDetay, previousListe, detayKey, listeKey };
    },

    onError: (error, _vars, context) => {
      if (context) {
        qc.setQueryData(context.detayKey, context.previousDetay);
        qc.setQueryData(context.listeKey, context.previousListe);
      }
      onError?.(errorText(error));
    },

    onSettled: () => qc.invalidateQueries({ queryKey: qk.denemeler() }),
  });
}

function errorText(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Kaydedilemedi, tekrar deneyin";
}
