"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MistakeRow } from "@/lib/db/database.types";
import type { DateStr } from "@/lib/date/types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import { randomId } from "./compress";
import { imagePath } from "./image";
import { toMistake } from "./queries";
import { advanceReview, toReviewState } from "./review";
import type { Mistake, MistakeDraft, PendingImage } from "./types";

const BUCKET = "mistakes";

/**
 * Yanlış kaydeder.
 *
 * ── Sıra: ÖNCE YÜKLEME, SONRA SATIR ──
 * Tersi (satır → yükleme → satırı güncelle) yükleme patladığında
 * listede gözle görülür şekilde bozuk bir kayıt bırakır. Bu sırada en
 * kötü ihtimalle Storage'da görünmez ve ucuz bir yetim nesne kalır;
 * satır insert'i patlarsa onu da temizlemeye çalışırız.
 *
 * Kimlik istemcide üretilir ki yol her iki işlemden önce bilinsin.
 */
export function useCreateMistake(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (draft: MistakeDraft) => {
      const supabase = createClient();

      let path: string | null = null;
      if (draft.image) {
        path = await uploadImage(draft.image);
      }

      const { data, error } = await supabase
        .from("mistakes")
        .insert({
          ders: draft.ders.trim(),
          konu: draft.konu.trim(),
          date: draft.date,
          note: normalizeNote(draft.note),
          image_path: path,
          image_width: draft.image?.width ?? null,
          image_height: draft.image?.height ?? null,
        })
        .select()
        .single();

      if (error) {
        // Satır yazılamadıysa yüklenen görsel yetim kalır. Temizliği
        // dene ama başarısızlığını yutma sebebi yapma: kullanıcıya
        // gösterilecek hata insert hatasıdır.
        if (path) await removeImage(path);
        throw error;
      }

      return toMistake(data as MistakeRow);
    },

    onSuccess: () => qc.invalidateQueries({ queryKey: qk.mistakes() }),
    onError: (error) => onError?.(errorText(error)),
  });
}

/**
 * Yanlışı günceller.
 *
 * `image` verilirse yeni görsel yüklenir ve ESKİSİ SİLİNİR — aksi halde
 * her düzenleme Storage'da bir yetim bırakırdı. `image` null ise mevcut
 * görsel olduğu gibi kalır (düzenleme formu görseli değiştirmek zorunda
 * değildir).
 *
 * Tekrar takvimi BİLEREK sıfırlanmaz: nottaki bir yazım hatasını
 * düzeltmek 21 günlük merdiveni yeniden başlatmamalı.
 */
export function useUpdateMistake(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mistake,
      draft,
    }: {
      mistake: Mistake;
      draft: MistakeDraft;
    }) => {
      const supabase = createClient();

      let path = mistake.imagePath;
      let width = mistake.imageWidth;
      let height = mistake.imageHeight;

      if (draft.image) {
        path = await uploadImage(draft.image);
        width = draft.image.width;
        height = draft.image.height;
      }

      const { error } = await supabase
        .from("mistakes")
        .update({
          ders: draft.ders.trim(),
          konu: draft.konu.trim(),
          date: draft.date,
          note: normalizeNote(draft.note),
          image_path: path,
          image_width: width,
          image_height: height,
        })
        .eq("id", mistake.id);

      if (error) {
        if (draft.image && path) await removeImage(path);
        throw error;
      }

      // Satır artık yeni görseli gösteriyor; eskisi güvenle silinebilir.
      if (draft.image && mistake.imagePath) {
        await removeImage(mistake.imagePath);
      }
    },

    onSuccess: () => qc.invalidateQueries({ queryKey: qk.mistakes() }),
    onError: (error) => onError?.(errorText(error)),
  });
}

/**
 * Yanlışı siler — optimistic.
 *
 * `useDeleteNote`'tan SAPMA: id yerine tüm `Mistake` alır, çünkü
 * Storage yoluna ihtiyaç var.
 *
 * ── Sıra: ÖNCE STORAGE, SONRA SATIR ──
 * Storage silme patlarsa iptal edilir ve satır yerinde kalır; kullanıcı
 * tekrar dener. Satır silme patlarsa geriye görseli eksik bir satır
 * kalır — UI zaten imza süresi dolması için kırık görsel yedeğine
 * sahip, yani veri kaybı değil zarif bozulmadır.
 */
export function useDeleteMistake(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (mistake: Mistake) => {
      const supabase = createClient();

      if (mistake.imagePath) {
        const { error } = await supabase.storage
          .from(BUCKET)
          .remove([mistake.imagePath]);
        if (error) throw error;
      }

      const { error } = await supabase
        .from("mistakes")
        .delete()
        .eq("id", mistake.id);
      if (error) throw error;
    },

    onMutate: async (mistake) => {
      await qc.cancelQueries({ queryKey: qk.mistakes() });
      const previous = qc.getQueryData<Mistake[]>(qk.mistakes());

      qc.setQueryData<Mistake[]>(qk.mistakes(), (list) =>
        list?.filter((m) => m.id !== mistake.id),
      );

      return { previous };
    },

    onError: (error, _mistake, context) => {
      qc.setQueryData(qk.mistakes(), context?.previous);
      onError?.(errorText(error));
    },

    onSettled: () => qc.invalidateQueries({ queryKey: qk.mistakes() }),
  });
}

/**
 * Tekrarı tamamlandı işaretler — optimistic.
 *
 * Bugün ekranında bir kutucuk dokunuşudur ve ağı beklemez: işaretleyip
 * bekletmek günlük kullanımı yorucu yapar (`useToggleTask` ile aynı
 * gerekçe).
 *
 * Sonraki vade `advanceReview` ile BUGÜNDEN hesaplanır — birikmiş
 * tekrarları toplu işaretleyen biri hepsini anında yeniden vadesi
 * gelmiş bulmamalı.
 */
export function useAdvanceReview(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ["advance-review"],

    mutationFn: async ({
      mistake,
      today,
    }: {
      mistake: Mistake;
      today: DateStr;
    }) => {
      const next = advanceReview(toReviewState(mistake), today);

      const supabase = createClient();
      const { error } = await supabase
        .from("mistakes")
        .update({
          review_stage: next.stage,
          next_review_date: next.nextReviewDate,
        })
        .eq("id", mistake.id);

      if (error) throw error;
    },

    onMutate: async ({ mistake, today }) => {
      await qc.cancelQueries({ queryKey: qk.mistakes() });
      const previous = qc.getQueryData<Mistake[]>(qk.mistakes());
      const next = advanceReview(toReviewState(mistake), today);

      qc.setQueryData<Mistake[]>(qk.mistakes(), (list) =>
        list?.map((m) =>
          m.id === mistake.id
            ? { ...m, reviewStage: next.stage, nextReviewDate: next.nextReviewDate }
            : m,
        ),
      );

      return { previous };
    },

    onError: (error, _vars, context) => {
      qc.setQueryData(qk.mistakes(), context?.previous);
      onError?.(errorText(error));
    },

    onSettled: () => {
      // Peş peşe birkaç tekrar işaretlemek tek yeniden çekme yapsın:
      // yalnızca son uçuştaki mutation invalidate eder.
      if (qc.isMutating({ mutationKey: ["advance-review"] }) === 1) {
        qc.invalidateQueries({ queryKey: qk.mistakes() });
      }
    },
  });
}

/**
 * Tek istekte gönderilecek azami kimlik sayısı.
 *
 * `.in()` filtresi URL'e yazılır; yüzlerce uuid tarayıcı ya da sunucu
 * URL sınırını aşabilir. Parçalama bu yüzden zorunludur.
 */
const RENAME_CHUNK = 200;

interface RenameVars {
  ids: readonly string[];
  /** Verilmezse ders alanına dokunulmaz. */
  ders?: string;
  /** Verilmezse konu alanına dokunulmaz. */
  konu?: string;
}

/**
 * Ders ya da konu adını toplu değiştirir.
 *
 * ── Neden OPTIMISTIC DEĞİL? ──
 * Tek satırlık işaretlemelerin aksine bu N satırı birden değiştirir ve
 * kullanıcının nadiren, bilerek yaptığı bir işlemdir. Önbelleği N satır
 * için yamalayıp hata anında geri almak, ağacın gözle görülür biçimde
 * iki kez sıçraması demek olurdu — üstelik yeniden gruplama yüzünden
 * dallar açılıp kapanırdı. Onay kutusu zaten bir bekleme anı yaratıyor;
 * yükleme durumunu oraya koymak daha dürüst.
 *
 * ── Neden kimlik listesiyle, `eq('ders', ...)` ile değil? ──
 * Eşleşme `normalize()` ile Türkçe büyük/küçük harf duyarsızdır ve
 * PostgREST'te böyle bir filtre yazılamaz (veritabanında normalize
 * karşılığı yok). Kimlikler zaten elde olan listeden `rename.ts` ile
 * hesaplanır; bu aynı zamanda onay kutusundaki "kaç kayıt" sayısını
 * bedavaya doğru yapar.
 *
 * ── Parça ortasında hata ──
 * Yarı yeniden adlandırılmış bir ders geriye iki dal olarak görünür.
 * Kabul edilebilir: işlem idempotenttir, kullanıcı tekrar çalıştırınca
 * kalanlar da düzelir. Tek kullanıcılık kişisel bir uygulamada bunun
 * için transaction'lı bir RPC yazmak, kazandırdığından fazlasını
 * karmaşıklık olarak geri alır.
 */
export function useRenameMistakeGroup(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, ders, konu }: RenameVars) => {
      if (ids.length === 0) return;

      const patch: { ders?: string; konu?: string } = {};
      if (ders !== undefined) patch.ders = ders.trim();
      if (konu !== undefined) patch.konu = konu.trim();
      if (Object.keys(patch).length === 0) return;

      const supabase = createClient();

      for (let i = 0; i < ids.length; i += RENAME_CHUNK) {
        const chunk = ids.slice(i, i + RENAME_CHUNK);
        const { error } = await supabase
          .from("mistakes")
          .update(patch)
          .in("id", chunk);
        if (error) throw error;
      }
    },

    onSuccess: () => qc.invalidateQueries({ queryKey: qk.mistakes() }),
    onError: (error) => onError?.(errorText(error)),
  });
}

/** Görseli yükler ve yolunu döner. */
async function uploadImage(image: PendingImage): Promise<string> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw authError ?? new Error("Oturum bulunamadı.");

  // `user_id` tabloya GÖNDERİLMEZ (trigger damgalar); kimlik yalnızca
  // Storage yolunu kurmak için gerekli ve politikalar onu doğruluyor.
  const path = imagePath(user.id, randomId());

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, image.blob, { contentType: "image/webp", upsert: false });

  if (error) throw error;
  return path;
}

/**
 * Yetim nesneyi temizlemeyi dener.
 *
 * Hatayı YUTAR: bu bir telafi işlemidir ve başarısızlığı kullanıcıya
 * gösterilecek asıl hatanın önüne geçmemeli. Tek kullanıcılık kişisel
 * bir uygulamada yılda birkaç 150 KB'lık artık nesne, bir temizleme
 * işi yazmayı hak etmez.
 */
async function removeImage(path: string): Promise<void> {
  try {
    await createClient().storage.from(BUCKET).remove([path]);
  } catch {
    // Yoksay.
  }
}

/** Boş ya da yalnızca boşluktan oluşan not null olarak saklanır. */
function normalizeNote(note: string | null): string | null {
  const trimmed = note?.trim();
  return trimmed ? trimmed : null;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Kaydedilemedi, tekrar deneyin";
}
