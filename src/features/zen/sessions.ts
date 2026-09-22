"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import { addDays, toParts } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import type { FocusSessionRow } from "@/lib/db/database.types";
import type { FocusMode } from "./types";

/**
 * Kaydedilmeye hazır bir odak oturumu.
 *
 * `userId` YOK ve olamaz: `stamp_user_id()` trigger'ı değeri sunucuda
 * oturumdan damgalıyor (0003). İstemcinin göndereceği bir kullanıcı
 * kimliğine güvenmek, RLS'i anlamsız kılardı.
 */
export interface FocusSessionDraft {
  taskId: string | null;
  taskTitle: string;
  mode: FocusMode;
  /** ISO damga. */
  startedAt: string;
  /** ISO damga. */
  endedAt: string;
  /** Duraklamalar DÜŞÜLMÜŞ süre. */
  netSeconds: number;
}

/**
 * Odak turunu kaydeder.
 *
 * ── Neden iyimser DEĞİL? ──
 * Görev işaretleme iyimser çünkü kullanıcı sonucu ANINDA görmek
 * istiyor. Burada gösterilecek bir şey yok: oturum zaten bitti, ekran
 * kapanıyor. İyimser yamalama, kazancı olmayan bir karmaşa olurdu.
 *
 * ── Hata oturumu KAPATMAYI engellemez ──
 * Çağıran taraf `mutate`ı ateşleyip beklemeden çıkıyor. Odaktan
 * çıkmayı ağa bağlamak, odak modunun yapabileceği en kötü hata
 * olurdu; kaybolan bir kayıt, kilitlenen bir ekrandan iyidir.
 */
export function useSaveFocusSession(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (draft: FocusSessionDraft) => {
      const supabase = createClient();

      const { error } = await supabase.from("focus_sessions").insert({
        task_id: draft.taskId,
        task_title: draft.taskTitle,
        mode: draft.mode,
        started_at: draft.startedAt,
        ended_at: draft.endedAt,
        net_seconds: draft.netSeconds,
      });

      if (error) throw error;
    },

    onError: (error) => {
      onError?.(
        error instanceof Error ? error.message : "Odak süresi kaydedilemedi.",
      );
    },

    /*
     * Önek geçersizleştirme: `qk.focusSessions()` altındaki TÜM gün
     * toplamlarını kapsıyor. Gece yarısına saniyeler kala biten bir
     * oturumun hangi güne düştüğü belirsizleşebilir; öneki tazelemek
     * her iki günü de doğruya çekiyor.
     */
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.focusSessions() });
    },
  });
}

/**
 * Bugünün toplam net odak süresi, saniye.
 *
 * ── Gün sınırı neden İSTEMCİDE? ──
 * `completed_at` / 0017 kararıyla aynı: damga saklanır, gün istemcide
 * türetilir. Sunucunun saat dilimine bırakılsaydı gece 00:30'da biten
 * bir oturum yanlış güne düşerdi.
 *
 * Sorgu gün ARALIĞIYLA yapılıyor — tüm oturumları çekip bellekte
 * filtrelemek, yıllar biriktikçe her ekran açılışında büyüyen bir yük
 * olurdu (`usePlanGoals`'ın ay başına bölünme gerekçesi).
 */
export function useTodayFocusSeconds(today: DateStr) {
  return useQuery({
    queryKey: qk.focusSessionsDay(today),
    queryFn: () => fetchDayFocusSeconds(today),
  });
}

async function fetchDayFocusSeconds(day: DateStr): Promise<number> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("focus_sessions")
    .select("net_seconds")
    .gte("started_at", dayStartIso(day))
    .lt("started_at", dayStartIso(addDays(day, 1)));

  if (error) throw error;

  return (data as Pick<FocusSessionRow, "net_seconds">[]).reduce(
    (sum, row) => sum + row.net_seconds,
    0,
  );
}

/**
 * Yerel gün başlangıcının ISO damgası.
 *
 * `new Date(y, m-1, d)` YEREL alanlardan kuruyor ve `toISOString()`
 * UTC'ye çeviriyor — Türkiye'de 00:00, damgada 21:00Z oluyor ve sorgu
 * doğru aralığı tarıyor.
 *
 * `DateStr` kuralı `Date`in MODÜL SINIRINI geçmesini yasaklıyor;
 * burada geçmiyor — fonksiyonun içinde doğup string olarak çıkıyor.
 *
 * Ayrıştırma `toParts` ile, elle `split` ile DEĞİL: tarih ayrıştırma
 * tek kaynaktan (`src/lib/date/`) yapılır. Aralığın üst sınırı da
 * `addDays(day, 1)` — ayrı bir "ertesi gün" yardımcısı yazmak,
 * ay/yıl sonu aritmetiğini ikinci kez ve daha kötü uygulamak olurdu.
 */
function dayStartIso(day: DateStr): string {
  const { year, month, day: date } = toParts(day);
  return new Date(year, month - 1, date, 0, 0, 0, 0).toISOString();
}

/**
 * Sayfa kapanırken oturumu kurtarır.
 *
 * ── Neden `supabase-js` DEĞİL? ──
 * `supabase-js` `fetch` kullanıyor ve sayfa kapanırken uçuştaki
 * `fetch` İPTAL EDİLİR. `sendBeacon` tarayıcıya isteği sayfa öldükten
 * sonra da göndermesi için söz verdiriyor.
 *
 * ── Neden kendi route'umuz? ──
 * `sendBeacon` özel BAŞLIK kabul etmiyor; PostgREST'e doğrudan gitmek
 * `apikey` ve `Authorization` başlıkları istiyordu. İnce bir route
 * handler'a sade JSON gidiyor, çerez otomatik taşınıyor ve `user_id`
 * SUNUCUDA belirleniyor.
 *
 * ── Neden `beforeunload` değil? ──
 * Mobil tarayıcılarda güvenilir tetiklenmiyor. Çağıran taraf
 * `visibilitychange` → `hidden` kullanıyor.
 *
 * Sessizce başarısız olabilir ve bu kabul ediliyor: alternatifi sayfa
 * kapanışını bir ağ isteğine bağlamak, ki bu daha kötü.
 */
export function sendFocusSessionBeacon(draft: FocusSessionDraft): void {
  if (typeof navigator === "undefined" || !navigator.sendBeacon) return;

  const body = new Blob([JSON.stringify(draft)], {
    type: "application/json",
  });

  navigator.sendBeacon("/api/focus-session", body);
}
