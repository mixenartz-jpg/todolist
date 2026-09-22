import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Sayfa kapanırken gelen odak oturumunu kaydeder.
 *
 * ── Bu route neden VAR? ──
 * `supabase-js` `fetch` kullanıyor ve sayfa kapanırken uçuştaki
 * `fetch` iptal ediliyor. `sendBeacon` bu sorunu çözüyor ama özel
 * BAŞLIK kabul etmiyor; PostgREST'e doğrudan gitmek `apikey` ve
 * `Authorization` istiyordu. Buraya sade JSON geliyor, çerez otomatik
 * taşınıyor.
 *
 * ── `user_id` istemciden GELMEZ ──
 * Oturum çerezden okunuyor ve satır o kullanıcı adına yazılıyor.
 * İstemcinin göndereceği bir kimliğe güvenmek RLS'i anlamsız kılardı.
 * `stamp_user_id()` trigger'ı (0003) zaten damgalıyor; buradaki oturum
 * kontrolü, kimliksiz bir isteğin sessizce düşmesi yerine açıkça
 * reddedilmesi için.
 *
 * ── Normal çıkışlar buraya UĞRAMAZ ──
 * Bitti / Çık / tur sonu mevcut desenle, `supabase-js` üzerinden
 * yazıyor. Burası yalnızca kapanışın kurtarma yolu.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return new NextResponse(null, { status: 403 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse(null, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const draft = parseDraft(body);
  if (draft === null) {
    return new NextResponse(null, { status: 400 });
  }

  const { error } = await supabase.from("focus_sessions").insert({
    task_id: draft.taskId,
    task_title: draft.taskTitle,
    mode: draft.mode,
    started_at: draft.startedAt,
    ended_at: draft.endedAt,
    net_seconds: draft.netSeconds,
  });

  if (error) {
    return new NextResponse(null, { status: 500 });
  }

  /*
   * 204: `sendBeacon` cevabı zaten OKUMUYOR ve sayfa çoktan kapanmış
   * olabilir. Gövde üretmek boşa iş.
   */
  return new NextResponse(null, { status: 204 });
}

/**
 * İstek AYNI KÖKENDEN mi geldi?
 *
 * ── Neden gerekli? ──
 * `sendBeacon` preflight'sız ve ÇEREZLE gönderiliyor. Kötü niyetli
 * bir site, kurbanın oturumu açıkken arka planda buraya istek atıp
 * sahte odak satırları yazdırabilirdi — hesap ele geçirme değil ama
 * kullanıcının kendi istatistiğini kirleten gerçek bir bütünlük
 * ihlali.
 *
 * ── Neden `Host`a karşı, sabit bir adrese karşı DEĞİL? ──
 * Ortam değişkeninden okunan bir adres, preview deploy'larda
 * (her deploy ayrı alan adı) meşru isteği reddederdi. İsteğin kendi
 * `Host` başlığıyla karşılaştırmak her ortamda doğru çalışıyor.
 *
 * ── `Sec-Fetch-Site` önce ──
 * Modern tarayıcıların doğrudan cevabı ve sayfa kodu tarafından
 * değiştirilemez. Yoksa `Origin`e düşülüyor; o da TARAYICI tarafından
 * ekleniyor ve JS ile değiştirilemiyor.
 *
 * ── İkisi de yoksa GEÇİLİYOR ──
 * Bazı istemciler hiçbirini göndermiyor ve yokluğu saldırı saymak
 * meşru isteği kırardı. Asıl savunma hattı zaten oturum kontrolü ve
 * RLS; bu, önüne konan ek bir katman.
 */
function isSameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site !== null) return site === "same-origin" || site === "none";

  const origin = request.headers.get("origin");
  if (origin === null) return true;

  const host = request.headers.get("host");
  if (host === null) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

interface ParsedDraft {
  taskId: string | null;
  taskTitle: string;
  mode: "free" | "pomodoro";
  startedAt: string;
  endedAt: string;
  netSeconds: number;
}

/** Bir oturumun kabul edilebilir en uzun net süresi. Bkz. `parseDraft`. */
const MAX_NET_SECONDS = 24 * 60 * 60;

/**
 * Başlık uzunluk sınırı — `tasks.title` ile AYNI (0001: 1..200).
 *
 * Bu alan o başlığın kopyası ve farklı bir sınır taşıması, kopyanın
 * aslından uzun olabileceği anlamına gelirdi. Sınırsız bırakmak ise
 * depolamayı şişiren bir yol açardı.
 */
const MAX_TITLE_LENGTH = 200;

/**
 * Gövdeyi doğrular.
 *
 * Sınırdan gelen veriye GÜVENİLMEZ. Doğrulama elle: şema kütüphanesi
 * projede yok ve tek bir uç nokta için eklemek orantısız olurdu.
 *
 * `netSeconds` üst sınırı 24 saat: daha büyüğü ya bir hata ya da
 * kasıtlı bir şişirme demek ve günlük toplamı anlamsız yapardı.
 *
 * Damgalar biçim olarak DOĞRULANMIYOR, yalnızca string olmaları
 * isteniyor: Postgres `timestamptz` zaten geçersiz bir damgayı
 * reddediyor ve ISO ayrıştırmasını burada ikinci kez uygulamak, iki
 * ayrı doğruluk kaynağı yaratmak olurdu.
 */
function parseDraft(body: unknown): ParsedDraft | null {
  if (typeof body !== "object" || body === null) return null;

  const b = body as Record<string, unknown>;

  if (b.taskId !== null && typeof b.taskId !== "string") return null;
  if (b.mode !== "free" && b.mode !== "pomodoro") return null;
  if (typeof b.startedAt !== "string") return null;
  if (typeof b.endedAt !== "string") return null;

  if (
    typeof b.taskTitle !== "string" ||
    b.taskTitle.trim().length === 0 ||
    b.taskTitle.length > MAX_TITLE_LENGTH
  ) {
    return null;
  }

  /*
   * Damgalar AYRIŞTIRILABİLİR ve sıraları doğru olmalı.
   *
   * Postgres `timestamptz` biçimi zaten doğruluyor ama SIRAYI
   * doğrulamıyor; ters bir çift tabloya anlamsız bir satır bırakırdı.
   * `Number.isNaN` kontrolü şart — `NaN < NaN` false döner ve
   * ayrıştırılamayan bir damga sessizce geçerdi.
   */
  const started = Date.parse(b.startedAt);
  const ended = Date.parse(b.endedAt);
  if (Number.isNaN(started) || Number.isNaN(ended)) return null;
  if (ended < started) return null;

  if (
    typeof b.netSeconds !== "number" ||
    !Number.isFinite(b.netSeconds) ||
    b.netSeconds < 0 ||
    b.netSeconds > MAX_NET_SECONDS
  ) {
    return null;
  }

  return {
    taskId: b.taskId,
    taskTitle: b.taskTitle,
    mode: b.mode,
    startedAt: b.startedAt,
    endedAt: b.endedAt,
    netSeconds: Math.floor(b.netSeconds),
  };
}
