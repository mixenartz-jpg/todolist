# Odak modu: süre kaydı + pomodoro — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Odak (Zen) ekranına duraklatılabilir bir sayaç, seçilebilir pomodoro modu ve her odak turunu `focus_sessions` tablosuna yazan kalıcılık eklemek.

**Architecture:** Saf mantık `zen.ts`'te toplanıyor (`now` hep parametre, `Date.now()` yok) ve tüm testler oraya yazılıyor. React tarafı ince kalıyor: `useFocusTimer` damga tabanlı tik + duraklatma durumunu tutuyor, `sessions.ts` react-query ile yazma/okuma yapıyor, `ZenScreen` yalnızca çiziyor. Sayfa kapanışı `sendBeacon` ile ince bir Next.js route handler'a gidiyor çünkü `supabase-js` `fetch` kullanıyor ve kapanan sayfada `fetch` iptal edilir.

**Tech Stack:** Next.js (App Router), React 19, TypeScript, Supabase (PostgREST + RLS), TanStack Query v5, Tailwind v4 + CSS değişkenleri, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-22-odak-pomodoro-sure-kaydi-design.md`

## Global Constraints

- **Yorum dili Türkçe ve GEREKÇELİ.** Bu projenin sicili: yorum "ne yapıyor" değil "neden böyle" yazar. Geri alınan bir karar sessizce silinmez, neden değiştiği yazılır.
- **Saf modül testi, React test kütüphanesi YOK.** Test edilen şey `zen.ts`'teki saf fonksiyonlar. Bileşen testi yazma.
- **`Date.now()` saf fonksiyona girmez.** Zaman hep `now: number` parametresi olarak geçer — saat okuyan fonksiyon test edilemez.
- **Takvim tarihi `DateStr`** ('YYYY-MM-DD' markalı string). `Date` nesnesi yalnızca `src/lib/date/` içinde kurulur.
- **İstemci `user_id` GÖNDERMEZ.** `stamp_user_id()` trigger'ı sunucuda damgalar (0003 deseni).
- **RLS üç kuralı (0002):** `(select auth.uid())` alt sorgu formu, `to authenticated` kapsamı, INSERT/UPDATE'te `with check`.
- **Migration'lar append-only** ve `if exists` / `if not exists` ile tekrar çalıştırılabilir.
- **Commit mesajları Türkçe, ASCII (Türkçe karakter yok), conventional commits:** `feat:`, `fix:`, `test:`, `docs:`, `refactor:`.
- **Her commit `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` ile biter.**
- **Pomodoro profilleri (tam değerler):** `25` → 25/5/15, `50` → 50/10/20, `90` → 90/20/30. Uzun mola **4 turda bir**.
- **Sekme eşiği: 60 saniye.** 60 saniyeden uzun gizli kalma otomatik duraklatır.
- **Doğrulama komutları:** `npm test`, `npm run typecheck`, `npm run lint`.

---

## Dosya Yapısı

| Dosya | Sorumluluk | Durum |
|---|---|---|
| `supabase/migrations/0021_focus_sessions.sql` | tablo + RLS + trigger + index | Yeni |
| `src/lib/db/database.types.ts` | `FocusSessionRow` | Değişen |
| `src/lib/query/keys.ts` | `qk.focusSessions()`, `qk.focusSessionsDay()` | Değişen |
| `src/features/zen/zen.ts` | saf mantık: biçimleme, net süre, faz geçişi | Değişen |
| `src/features/zen/zen.test.ts` | saf mantığın tüm testleri | Değişen |
| `src/features/zen/types.ts` | `FocusMode`, `PomodoroProfile`, `TimerState`, `Phase` | Yeni |
| `src/features/zen/useFocusTimer.ts` | damga tabanlı tik + duraklat + sekme koruması | Yeni (`useZenTimer.ts` yerine) |
| `src/features/zen/sessions.ts` | react-query yazma/okuma + `sendBeacon` | Yeni |
| `src/app/api/focus-session/route.ts` | `sendBeacon` kurtarma yolu | Yeni |
| `src/features/zen/FocusModeToggle.tsx` | mod + profil seçimi | Yeni |
| `src/features/zen/PomodoroDots.tsx` | tur göstergesi | Yeni |
| `src/features/zen/ZenScreen.tsx` | çizim, akış | Değişen |
| `src/features/zen/zen.css` | duraklatılmış / mola durumları | Değişen |

**Bağımlılık sırası:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Her görev kendi başına test edilebilir bir çıktı bırakır.

---

## Task 1: Saf mantık — tipler, süre biçimleme, net süre

**Files:**
- Create: `src/features/zen/types.ts`
- Modify: `src/features/zen/zen.ts`
- Test: `src/features/zen/zen.test.ts`

**Interfaces:**
- Consumes: mevcut `formatElapsed(seconds: number): string`, `elapsedSeconds(startedAt: number, now: number): number` — **ikisi de değişmeden kalır**, mevcut testleri aynen geçmeli.
- Produces:
  - `type FocusMode = "free" | "pomodoro"`
  - `type PomodoroProfileId = 25 | 50 | 90`
  - `type Phase = "focus" | "shortBreak" | "longBreak"`
  - `interface TimerState { startedAt: number; pausedTotalMs: number; pausedAt: number | null }`
  - `netSeconds(state: TimerState, now: number): number`
  - `startTimer(now: number): TimerState`
  - `pauseTimer(state: TimerState, at: number): TimerState`
  - `resumeTimer(state: TimerState, at: number): TimerState`

- [ ] **Step 1: Tipleri yaz**

`src/features/zen/types.ts` oluştur:

```ts
/**
 * Odak oturumunun tipleri.
 *
 * Saf mantıktan (zen.ts) AYRI dosyada: tipleri hem saf mantık, hem
 * hook, hem de bileşenler okuyor ve hepsini `zen.ts`ten almak, çizim
 * katmanını saf mantık modülüne bağımlı kılardı.
 */

/** Sayaç modu. `free` yukarı sayar, `pomodoro` geri. */
export type FocusMode = "free" | "pomodoro";

/** Pomodoro süre profili — dakika cinsinden odak süresiyle adlandırılır. */
export type PomodoroProfileId = 25 | 50 | 90;

/** Pomodoro döngüsünün içinde bulunulan aşama. */
export type Phase = "focus" | "shortBreak" | "longBreak";

/**
 * Sayacın durumu — damga tabanlı.
 *
 * Saniye SAYILMIYOR, damga tutuluyor ve fark her tikte YENİDEN
 * hesaplanıyor. Gerekçe `useFocusTimer.ts`te: tarayıcı arka plandaki
 * sekmede zamanlayıcıları kısıtlıyor ve `count + 1` birikimli hata
 * üretiyor.
 *
 * `pausedTotalMs` GEÇMİŞ duraklamaların toplamı; `pausedAt` ise ŞU AN
 * duraklatılmışsa o anın damgası. İkisi ayrı çünkü biri kapanmış
 * aralıkları, diğeri açık bir aralığı temsil ediyor.
 */
export interface TimerState {
  startedAt: number;
  pausedTotalMs: number;
  pausedAt: number | null;
}
```

- [ ] **Step 2: Başarısız testleri yaz**

`src/features/zen/zen.test.ts` sonuna ekle (üstteki import satırını da güncelle):

```ts
import {
  elapsedSeconds,
  formatElapsed,
  netSeconds,
  pauseTimer,
  resumeTimer,
  startTimer,
} from "./zen";
```

```ts
describe("netSeconds", () => {
  it("duraklatılmamış sayaçta geçen süreyi verir", () => {
    const state = startTimer(1_000_000);
    expect(netSeconds(state, 1_010_000)).toBe(10);
  });

  it("duraklatılmışken SABİT kalır", () => {
    const started = startTimer(1_000_000);
    const paused = pauseTimer(started, 1_010_000);

    expect(netSeconds(paused, 1_010_000)).toBe(10);
    expect(netSeconds(paused, 1_050_000)).toBe(10);
    expect(netSeconds(paused, 9_999_999)).toBe(10);
  });

  it("sürdürülünce duraklama süresini DÜŞER", () => {
    const started = startTimer(1_000_000);
    const paused = pauseTimer(started, 1_010_000); // 10 sn çalıştı
    const resumed = resumeTimer(paused, 1_040_000); // 30 sn durdu

    // 10 sn daha çalış: toplam 20 sn, aradaki 30 sn sayılmaz.
    expect(netSeconds(resumed, 1_050_000)).toBe(20);
  });

  it("çoklu duraklatmayı biriktirir", () => {
    let s = startTimer(0);
    s = pauseTimer(s, 5_000); // 5 sn çalıştı
    s = resumeTimer(s, 15_000); // 10 sn durdu
    s = pauseTimer(s, 20_000); // 5 sn daha çalıştı → 10
    s = resumeTimer(s, 40_000); // 20 sn daha durdu

    expect(netSeconds(s, 43_000)).toBe(13);
  });

  /*
   * Sistem saati geri alınırsa (yaz saati, NTP) net süre negatife
   * düşer ve "-3:12" görünürdü.
   */
  it("negatifi sıfıra kırpar", () => {
    const state = startTimer(1_005_000);
    expect(netSeconds(state, 1_000_000)).toBe(0);
  });

  it("duraklatılmışı tekrar duraklatmak durumu DEĞİŞTİRMEZ", () => {
    const started = startTimer(0);
    const paused = pauseTimer(started, 5_000);

    expect(pauseTimer(paused, 9_000)).toEqual(paused);
  });

  it("çalışanı sürdürmek durumu DEĞİŞTİRMEZ", () => {
    const started = startTimer(0);
    expect(resumeTimer(started, 5_000)).toEqual(started);
  });
});
```

- [ ] **Step 3: Testlerin BAŞARISIZ olduğunu doğrula**

Çalıştır: `npm test -- src/features/zen/zen.test.ts`
Beklenen: FAIL — `netSeconds is not a function` (veya import hatası).

- [ ] **Step 4: Saf mantığı yaz**

`src/features/zen/zen.ts` dosyasının **başındaki yorum bloğunu tamamen değiştir** ve altına fonksiyonları ekle. Dosyanın yeni başı:

```ts
import type { TimerState } from "./types";

/**
 * Zen odak modunun saf mantığı.
 *
 * ── Sayaç neden iki MOD? ──
 * Eskiden yalnızca yukarı sayardı ve gerekçesi şuydu: geri sayan bir
 * sayaç hedef süre ister, hedefi tutturamamak da başarısızlık üretir.
 * Bu gerekçe HÂLÂ GEÇERLİ ve bu yüzden serbest mod VARSAYILAN kaldı.
 * Pomodoro yanına eklendi, yerine değil — hedefi isteyen seçiyor,
 * istemeyene dayatılmıyor.
 *
 * ── Süre neden artık KAYDEDİLİYOR? ──
 * Eskiden kaydedilmezdi ve gerekçesi şuydu: sayaç Zen'in AÇIK olduğu
 * süreyi ölçüyor, çalışılan süreyi değil — kullanıcı ekranı açık
 * bırakıp kahve içmiş olabilir ve ölçmediğimiz bir şeyi kaydetmek
 * veriyi yalancı yapar.
 *
 * O gerekçe DURAKLATMA YOKLUĞUNDAN doğuyordu. Artık duraklatma var
 * ve sekme 60 saniyeden uzun arka planda kalırsa sayaç kendiliğinden
 * duruyor (bkz. `useFocusTimer.ts`). Ölçülen şey artık gerçekten
 * çalışılan süreye yaklaşıyor; kayıt yalan söylemiyor.
 *
 * Kaydedilen değer `net_seconds` — duraklamalar DÜŞÜLMÜŞ süre. Ham
 * `ended_at - started_at` farkı kaydedilseydi tam da kaçındığımız
 * yalan geri gelirdi.
 */
```

Mevcut `formatElapsed` ve `elapsedSeconds` fonksiyonlarını **olduğu gibi bırak**, altlarına ekle:

```ts
/** Sıfırdan başlayan, duraklatılmamış bir sayaç. */
export function startTimer(now: number): TimerState {
  return { startedAt: now, pausedTotalMs: 0, pausedAt: null };
}

/**
 * Sayacı duraklatır.
 *
 * Zaten duraklatılmışsa AYNI nesneyi döndürür — ikinci bir damga
 * yazmak, ilk duraklamanın başlangıcını kaybettirir ve o aralık
 * net süreye geri sayılırdı.
 */
export function pauseTimer(state: TimerState, at: number): TimerState {
  if (state.pausedAt !== null) return state;
  return { ...state, pausedAt: at };
}

/**
 * Sayacı sürdürür ve duraklama süresini toplama yazar.
 *
 * Duraklatılmamışsa AYNI nesneyi döndürür: `pausedAt === null` iken
 * fark hesaplamak `at - null` demek olurdu.
 *
 * Fark NEGATİFSE sıfır eklenir (saat geri alınmış olabilir); negatif
 * bir duraklama toplamı, net süreyi gerçekte olduğundan UZUN
 * gösterirdi.
 */
export function resumeTimer(state: TimerState, at: number): TimerState {
  if (state.pausedAt === null) return state;

  const pausedMs = Math.max(0, at - state.pausedAt);

  return {
    startedAt: state.startedAt,
    pausedTotalMs: state.pausedTotalMs + pausedMs,
    pausedAt: null,
  };
}

/**
 * Duraklamalar düşülmüş net süre, saniye.
 *
 * Şu an duraklatılmışsa AÇIK aralık da düşülüyor — yoksa duraklatma
 * düğmesine basılı bekleyen sayaç ekranda ilerlemeye devam ederdi.
 *
 * Sıfıra kırpma `elapsedSeconds` ile aynı gerekçe: sistem saati geri
 * alınırsa sayaç "-3:12" gösterirdi.
 */
export function netSeconds(state: TimerState, now: number): number {
  const openPauseMs = state.pausedAt === null ? 0 : Math.max(0, now - state.pausedAt);
  const netMs = now - state.startedAt - state.pausedTotalMs - openPauseMs;

  return Math.max(0, Math.floor(netMs / 1000));
}
```

- [ ] **Step 5: Testlerin GEÇTİĞİNİ doğrula**

Çalıştır: `npm test -- src/features/zen/zen.test.ts`
Beklenen: PASS — hem yeni testler hem mevcut `formatElapsed`/`elapsedSeconds` testleri.

- [ ] **Step 6: Tip kontrolü**

Çalıştır: `npm run typecheck`
Beklenen: hata yok.

- [ ] **Step 7: Commit**

```bash
git add src/features/zen/types.ts src/features/zen/zen.ts src/features/zen/zen.test.ts
git commit -F - <<'MSG'
feat: odak sayacina duraklatma mantigi

Damga tabanli TimerState ve net sure hesabi. Duraklamalar dusulerek
hesaplanan net sure, kaydin yalan soylememesinin on kosulu.

zen.ts yorum blogu yeniden yazildi: sure kaydetmeme karari iptal
edilmiyor, kosulu degisiyor ve gerekce dosyada.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

## Task 2: Saf mantık — pomodoro faz döngüsü

**Files:**
- Modify: `src/features/zen/zen.ts`
- Modify: `src/features/zen/types.ts`
- Test: `src/features/zen/zen.test.ts`

**Interfaces:**
- Consumes: Task 1'den `Phase`, `PomodoroProfileId`.
- Produces:
  - `interface PomodoroProfile { id: PomodoroProfileId; focusMin: number; shortBreakMin: number; longBreakMin: number }`
  - `const POMODORO_PROFILES: readonly PomodoroProfile[]`
  - `const ROUNDS_BEFORE_LONG_BREAK = 4`
  - `profileById(id: PomodoroProfileId): PomodoroProfile`
  - `phaseSeconds(profile: PomodoroProfile, phase: Phase): number`
  - `nextPhase(phase: Phase, completedFocusRounds: number): Phase`
  - `remainingSeconds(totalSeconds: number, elapsed: number): number`

- [ ] **Step 1: Profil tipini ekle**

`src/features/zen/types.ts` sonuna:

```ts
/**
 * Bir pomodoro süre profili.
 *
 * Üç hazır profil var, serbest dakika girişi YOK: sayı girdirmek
 * "doğru süreyi" bir ayar sorununa çeviriyor ve odak ekranının tek
 * işi karar sayısını azaltmak.
 */
export interface PomodoroProfile {
  id: PomodoroProfileId;
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
}
```

- [ ] **Step 2: Başarısız testleri yaz**

`src/features/zen/zen.test.ts` sonuna ekle (import satırını genişlet):

```ts
import {
  POMODORO_PROFILES,
  ROUNDS_BEFORE_LONG_BREAK,
  nextPhase,
  phaseSeconds,
  profileById,
  remainingSeconds,
} from "./zen";
```

```ts
describe("POMODORO_PROFILES", () => {
  it("uc profil tanimlar", () => {
    expect(POMODORO_PROFILES.map((p) => p.id)).toEqual([25, 50, 90]);
  });

  it("spec'teki sureleri tasir", () => {
    expect(profileById(25)).toEqual({
      id: 25,
      focusMin: 25,
      shortBreakMin: 5,
      longBreakMin: 15,
    });
    expect(profileById(50)).toEqual({
      id: 50,
      focusMin: 50,
      shortBreakMin: 10,
      longBreakMin: 20,
    });
    expect(profileById(90)).toEqual({
      id: 90,
      focusMin: 90,
      shortBreakMin: 20,
      longBreakMin: 30,
    });
  });
});

describe("phaseSeconds", () => {
  it("dakikayi saniyeye cevirir", () => {
    const p = profileById(25);
    expect(phaseSeconds(p, "focus")).toBe(25 * 60);
    expect(phaseSeconds(p, "shortBreak")).toBe(5 * 60);
    expect(phaseSeconds(p, "longBreak")).toBe(15 * 60);
  });

  it("90 profilinde de dogru", () => {
    const p = profileById(90);
    expect(phaseSeconds(p, "focus")).toBe(5400);
    expect(phaseSeconds(p, "longBreak")).toBe(1800);
  });
});

describe("nextPhase", () => {
  it("odaktan sonra kisa mola gelir", () => {
    expect(nextPhase("focus", 1)).toBe("shortBreak");
    expect(nextPhase("focus", 2)).toBe("shortBreak");
    expect(nextPhase("focus", 3)).toBe("shortBreak");
  });

  it("dorduncu turdan sonra UZUN mola gelir", () => {
    expect(nextPhase("focus", ROUNDS_BEFORE_LONG_BREAK)).toBe("longBreak");
    expect(nextPhase("focus", 8)).toBe("longBreak");
  });

  it("her iki moladan sonra odaga doner", () => {
    expect(nextPhase("shortBreak", 1)).toBe("focus");
    expect(nextPhase("longBreak", 4)).toBe("focus");
  });

  /* Tam dongu: odak-kisa-odak-kisa-odak-kisa-odak-UZUN */
  it("tam donguyu dogru sirayla yurutur", () => {
    const seen: Phase[] = [];
    let phase: Phase = "focus";
    let rounds = 0;

    for (let i = 0; i < 8; i += 1) {
      if (phase === "focus") rounds += 1;
      phase = nextPhase(phase, rounds);
      seen.push(phase);
    }

    expect(seen).toEqual([
      "shortBreak",
      "focus",
      "shortBreak",
      "focus",
      "shortBreak",
      "focus",
      "longBreak",
      "focus",
    ]);
  });
});

describe("remainingSeconds", () => {
  it("kalan sureyi verir", () => {
    expect(remainingSeconds(1500, 100)).toBe(1400);
  });

  it("sure dolunca sifir verir", () => {
    expect(remainingSeconds(1500, 1500)).toBe(0);
  });

  /* Sekme arka planda kalip tik atlanirsa elapsed hedefi ASABILIR. */
  it("hedefi asan elapsed'de sifirda durur", () => {
    expect(remainingSeconds(1500, 1900)).toBe(0);
  });
});
```

`Phase` tipini test dosyasına da import et:

```ts
import type { Phase } from "./types";
```

- [ ] **Step 3: Testlerin BAŞARISIZ olduğunu doğrula**

Çalıştır: `npm test -- src/features/zen/zen.test.ts`
Beklenen: FAIL — `POMODORO_PROFILES is not defined`.

- [ ] **Step 4: Faz mantığını yaz**

`src/features/zen/zen.ts` sonuna ekle. İmport satırını genişlet:

```ts
import type { Phase, PomodoroProfile, PomodoroProfileId, TimerState } from "./types";
```

```ts
/**
 * Kaç odak turundan sonra uzun mola gelir.
 *
 * Dört, klasik pomodoro sayısı ve sabit tutuluyor: profil başına
 * farklı bir tur sayısı, kullanıcının aklında tutması gereken ikinci
 * bir kural olurdu.
 */
export const ROUNDS_BEFORE_LONG_BREAK = 4;

/**
 * Üç hazır süre profili.
 *
 * `id` odak dakikasıyla AYNI sayı: arayüzde "25 · 50 · 90" diye
 * çizilip seçiliyor ve ayrı bir etiket taşımak, aynı bilgiyi iki
 * yerde tutmak olurdu.
 *
 * 90/20 profili sınav çalışması için: iki saatlik bir deneme
 * oturumunu 25 dakikaya bölmek, oturumun kendisini bozar.
 */
export const POMODORO_PROFILES: readonly PomodoroProfile[] = [
  { id: 25, focusMin: 25, shortBreakMin: 5, longBreakMin: 15 },
  { id: 50, focusMin: 50, shortBreakMin: 10, longBreakMin: 20 },
  { id: 90, focusMin: 90, shortBreakMin: 20, longBreakMin: 30 },
] as const;

/**
 * Kimliğe göre profil.
 *
 * Bulunamazsa İLK profile düşer, hata FIRLATMAZ: `localStorage`'da
 * eski ya da bozuk bir değer kalmış olabilir ve odak ekranının
 * tamamen çökmesi orantısız bir ceza olurdu.
 */
export function profileById(id: PomodoroProfileId): PomodoroProfile {
  return POMODORO_PROFILES.find((p) => p.id === id) ?? POMODORO_PROFILES[0];
}

/** Bir aşamanın toplam süresi, saniye. */
export function phaseSeconds(profile: PomodoroProfile, phase: Phase): number {
  if (phase === "focus") return profile.focusMin * 60;
  if (phase === "shortBreak") return profile.shortBreakMin * 60;
  return profile.longBreakMin * 60;
}

/**
 * Bu aşamadan sonra hangi aşama gelir.
 *
 * `completedFocusRounds` BİTMİŞ odak turlarının sayısı (bu aşama
 * dahil). Dördün katıysa uzun mola gelir.
 *
 * Fonksiyon aşamayı yalnızca HESAPLAR, başlatmaz: geri sayım bitince
 * ekran kendiliğinden geçmiyor, "mola başladı" diyip kullanıcıyı
 * bekliyor. Otomatik geçiş, masa başından kalkmış kullanıcının
 * molasını sessizce tüketirdi.
 */
export function nextPhase(phase: Phase, completedFocusRounds: number): Phase {
  if (phase !== "focus") return "focus";

  return completedFocusRounds % ROUNDS_BEFORE_LONG_BREAK === 0
    ? "longBreak"
    : "shortBreak";
}

/**
 * Geri sayımda kalan saniye.
 *
 * Sıfırın altına DÜŞMEZ: sekme arka planda kalıp tikler atlandığında
 * `elapsed` hedefi aşabilir ve sayaç negatif göstermeye başlardı.
 */
export function remainingSeconds(totalSeconds: number, elapsed: number): number {
  return Math.max(0, totalSeconds - elapsed);
}
```

- [ ] **Step 5: Testlerin GEÇTİĞİNİ doğrula**

Çalıştır: `npm test -- src/features/zen/zen.test.ts`
Beklenen: PASS — tüm testler.

- [ ] **Step 6: Tip kontrolü ve lint**

Çalıştır: `npm run typecheck && npm run lint`
Beklenen: hata yok.

- [ ] **Step 7: Commit**

```bash
git add src/features/zen/zen.ts src/features/zen/types.ts src/features/zen/zen.test.ts
git commit -F - <<'MSG'
feat: pomodoro faz dongusu saf mantigi

Uc profil (25/50/90), dort turda bir uzun mola, kalan sure hesabi.
nextPhase yalnizca hesaplar, baslatmaz: otomatik gecis masa basindan
kalkmis kullanicinin molasini sessizce tuketirdi.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

## Task 3: Migration — `focus_sessions` tablosu

**Files:**
- Create: `supabase/migrations/0021_focus_sessions.sql`
- Modify: `src/lib/db/database.types.ts`

**Interfaces:**
- Produces: `focus_sessions` tablosu ve `FocusSessionRow` tipi:
  ```ts
  interface FocusSessionRow {
    id: string; user_id: string; task_id: string | null;
    task_title: string; mode: "free" | "pomodoro";
    started_at: string; ended_at: string;
    net_seconds: number; created_at: string;
  }
  ```

- [ ] **Step 1: Migration'ı yaz**

`supabase/migrations/0021_focus_sessions.sql` oluştur:

```sql
-- ═══════════════════════════════════════════════════════════════════
-- 0021 — Odak oturumları
--
-- Zen ekranı bugüne kadar hiçbir şey kaydetmiyordu ve bu BİLEREK
-- böyleydi: sayaç "Zen'in açık olduğu süreyi" ölçüyor, "çalışılan
-- süreyi" değil. Kullanıcı ekranı açık bırakıp kahve içmiş olabilir
-- ve ölçmediğimiz bir şeyi kaydetmek veriyi yalancı yapar.
--
-- O gerekçe DURAKLATMA YOKLUĞUNDAN doğuyordu. Artık duraklatma var ve
-- sekme 60 saniyeden uzun arka planda kalırsa sayaç kendiliğinden
-- duruyor. Ölçülen şey gerçekten çalışılan süreye yaklaştı; tablo bu
-- yüzden açılabiliyor.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- ── Neden `on delete set null` + başlık KOPYASI? ──
  -- Görev silinince odak geçmişi silinmemeli: "bu hafta 12 saat
  -- odaklandım" bilgisi, görevin hâlâ var olmasına bağlı olamaz.
  --
  -- Başlık satıra kopyalanıyor ki silinmiş görevin kaydı "(bilinmeyen
  -- iş)" diye okunmasın. `completed_at`in `done`dan ayrı tutulması
  -- (0017) ile aynı ruh: DURUM ve TARİH ayrı yaşar.
  --
  -- Görev sonradan yeniden adlandırılırsa eski kayıtta ESKİ ad kalır
  -- ve bu KASITLI: oturum, o an neye odaklanıldığının kaydı. Geçmiş
  -- kayıtları güncellemek, geçmişi yeniden yazmak olurdu.
  task_id uuid references public.tasks(id) on delete set null,
  task_title text not null,

  -- 'break' değeri YOK ve olmayacak: tablo yalnızca odak turlarını
  -- tutuyor, böylece "bugün ne kadar çalıştım" sorusu burada TEK
  -- anlamlı kalıyor. Mola kaydı istenirse kısıt genişletilir.
  mode text not null check (mode in ('free', 'pomodoro')),

  started_at timestamptz not null,
  ended_at timestamptz not null,

  -- ── Neden TÜRETİLMİYOR? ──
  -- `ended_at - started_at` duraklamaları İÇERİR ve tam da
  -- kaçındığımız yalanı üretir. Net süre istemcide, duraklamalar
  -- düşülerek hesaplanıp yazılıyor.
  net_seconds integer not null check (net_seconds >= 0),

  created_at timestamptz not null default now()
);

comment on table public.focus_sessions is
  'Odak (Zen) oturumlari. Her odak TURU bir satir; mola satiri yoktur.';
comment on column public.focus_sessions.task_title is
  'Gorev basliginin o anki kopyasi. Gorev silinse de gecmis okunabilir kalsin diye.';
comment on column public.focus_sessions.net_seconds is
  'Duraklamalar dusulmus net sure. ended_at - started_at ile AYNI DEGILDIR.';

-- Ekranın tek sorgu şekli: "bu kullanıcının oturumları, en yeniden
-- eskiye". `tasks_user_completed_idx` (0017) ile aynı şekil.
create index if not exists focus_sessions_user_started_idx
  on public.focus_sessions (user_id, started_at desc);


-- ═══════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════
-- 0002'nin üç kuralı: `(select auth.uid())` alt sorgu formu,
-- `to authenticated` kapsamı, INSERT'te `with check`.

alter table public.focus_sessions enable row level security;

drop policy if exists focus_sessions_select on public.focus_sessions;
create policy focus_sessions_select on public.focus_sessions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists focus_sessions_insert on public.focus_sessions;
create policy focus_sessions_insert on public.focus_sessions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- ── UPDATE politikası YOK ──
-- Bir odak oturumu BİTMİŞ bir olaydır; düzeltilecek bir şey yok.
-- Politikayı yazmamak, yanlışlıkla geçmişi değiştiren bir kod
-- yolunu yapısal olarak imkânsız kılıyor.

drop policy if exists focus_sessions_delete on public.focus_sessions;
create policy focus_sessions_delete on public.focus_sessions
  for delete to authenticated
  using ((select auth.uid()) = user_id);


-- ═══════════════════════════════════════════════════════════════════
-- Trigger
-- ═══════════════════════════════════════════════════════════════════
-- İstemci `user_id` GÖNDERMEZ; değer sunucuda oturumdan damgalanır
-- (0003). `updated_at` trigger'ı YOK — satır güncellenmiyor.

drop trigger if exists focus_sessions_stamp_user_id on public.focus_sessions;
create trigger focus_sessions_stamp_user_id
  before insert on public.focus_sessions
  for each row execute function public.stamp_user_id();
```

- [ ] **Step 2: Satır tipini ekle**

`src/lib/db/database.types.ts` sonuna ekle:

```ts
/**
 * Odak oturumu satırı (0021).
 *
 * `task_id` null olabilir (görev silinmiş) ama `task_title` ASLA:
 * geçmiş, görevin hâlâ var olmasına bağlı olmadan okunabilir kalmalı.
 *
 * `net_seconds` `ended_at - started_at` DEĞİLDİR — duraklamalar
 * düşülmüş süredir.
 */
export interface FocusSessionRow {
  id: string;
  user_id: string;
  task_id: string | null;
  task_title: string;
  mode: "free" | "pomodoro";
  started_at: string;
  ended_at: string;
  net_seconds: number;
  created_at: string;
}
```

- [ ] **Step 3: Tip kontrolü**

Çalıştır: `npm run typecheck`
Beklenen: hata yok.

- [ ] **Step 4: Migration'ı Supabase'e uygula**

Supabase panelinde SQL Editor'a `0021_focus_sessions.sql` içeriğini yapıştır ve çalıştır.

Beklenen: hatasız. Doğrulama sorgusu:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'focus_sessions'
order by ordinal_position;
```

Beklenen çıktı 9 satır: `id, user_id, task_id, task_title, mode, started_at, ended_at, net_seconds, created_at`.

**Not:** Bu adım manuel. Uygulanmadan Task 4 ve sonrası çalışmaz.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0021_focus_sessions.sql src/lib/db/database.types.ts
git commit -F - <<'MSG'
feat: focus_sessions tablosu (0021)

Her odak turu bir satir. task_id silinince null olur ama task_title
kopyasi kalir: gecmis, gorevin var olmasina bagli olmamali.

UPDATE politikasi bilerek YOK - bitmis bir olay duzeltilmez.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

## Task 4: Sorgu anahtarları + oturum yazma/okuma

**Files:**
- Modify: `src/lib/query/keys.ts`
- Create: `src/features/zen/sessions.ts`

**Interfaces:**
- Consumes: Task 3'ten `FocusSessionRow`; Task 1'den `FocusMode`.
- Produces:
  - `qk.focusSessions(): readonly ["focus-sessions"]`
  - `qk.focusSessionsDay(date: DateStr): readonly ["focus-sessions", "day", DateStr]`
  - `interface FocusSessionDraft { taskId: string | null; taskTitle: string; mode: FocusMode; startedAt: string; endedAt: string; netSeconds: number }`
  - `useSaveFocusSession(): UseMutationResult` — `mutate(draft: FocusSessionDraft)`
  - `useTodayFocusSeconds(today: DateStr): UseQueryResult<number>`
  - `sendFocusSessionBeacon(draft: FocusSessionDraft): void`

- [ ] **Step 1: Sorgu anahtarlarını ekle**

`src/lib/query/keys.ts` içinde `denemeTekrarlari` girdisinden **sonra**, kapanış `} as const;` satırından **önce** ekle:

```ts
  /*
   * Odak oturumları (0021).
   *
   * Anahtar "focus-sessions": TİRELİ TEK PARÇA, `plan-goals` ve
   * `week-goals` ile aynı gerekçe — ileride eklenecek bir
   * `qk.focus(...)` anahtarının önek eşleşmesiyle bunu da geçersiz
   * kılması yapısal olarak imkânsız kalsın.
   *
   * Gün başına alt anahtar: ekran YALNIZCA "bugün ne kadar
   * odaklandım" sorusunu soruyor ve oturumlar yıllar boyunca
   * birikiyor — `planGoalsMonth`'un bölünme gerekçesinin aynısı.
   * Bir oturum kaydedilince önek eşleşmesiyle o günün toplamı
   * tazeleniyor (`notePlansMonth` ile aynı YÖN: önek burada tam
   * olarak istenen işi ücretsiz yapıyor).
   */
  focusSessions: () => ["focus-sessions"] as const,
  focusSessionsDay: (date: DateStr) =>
    ["focus-sessions", "day", date] as const,
```

- [ ] **Step 2: `sessions.ts` yaz**

`src/features/zen/sessions.ts` oluştur:

```ts
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
 * istiyor. Burada gösterilecek bir şey yok: oturum zaten bitti,
 * ekran kapanıyor. İyimser yamalama, kazancı olmayan bir karmaşa
 * olurdu.
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
 * Sorgu gün ARALIĞIYLA yapılıyor (yerel gün başı/sonu ISO'ya
 * çevrilerek) — tüm oturumları çekip bellekte filtrelemek, yıllar
 * biriktikçe her ekran açılışında büyüyen bir yük olurdu.
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
 * Ayrıştırma `toParts` ile, elle `split` ile DEĞİL: tarih
 * ayrıştırmanın tek kaynağı `src/lib/date/`.
 *
 * Aralığın üst sınırı `addDays(day, 1)` — ayrı bir "ertesi gün"
 * yardımcısı yazmak, ay/yıl sonu aritmetiğini ikinci kez (ve daha
 * kötü) uygulamak olurdu.
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
 * `fetch` İPTAL EDİLİR. `sendBeacon` tarayıcıya isteği sayfa
 * öldükten sonra da göndermesi için söz verdiriyor.
 *
 * ── Neden kendi route'umuz? ──
 * `sendBeacon` özel BAŞLIK kabul etmiyor; PostgREST'e doğrudan
 * gitmek `apikey` ve `Authorization` başlıkları istiyordu. İnce bir
 * route handler'a sade JSON gidiyor, çerez otomatik taşınıyor ve
 * `user_id` SUNUCUDA belirleniyor.
 *
 * ── Neden `beforeunload` değil? ──
 * Mobil tarayıcılarda güvenilir tetiklenmiyor. Çağıran taraf
 * `visibilitychange` → `hidden` kullanıyor.
 *
 * Sessizce başarısız olabilir ve bu kabul ediliyor: alternatifi
 * sayfa kapanışını bir ağ isteğine bağlamak, ki bu daha kötü.
 */
export function sendFocusSessionBeacon(draft: FocusSessionDraft): void {
  if (typeof navigator === "undefined" || !navigator.sendBeacon) return;

  const body = new Blob([JSON.stringify(draft)], {
    type: "application/json",
  });

  navigator.sendBeacon("/api/focus-session", body);
}
```

- [ ] **Step 3: Tip kontrolü ve lint**

Çalıştır: `npm run typecheck && npm run lint`
Beklenen: hata yok.

- [ ] **Step 4: Mevcut testlerin kırılmadığını doğrula**

Çalıştır: `npm test`
Beklenen: PASS — `keys.test.ts` dahil hepsi.

- [ ] **Step 5: Commit**

```bash
git add src/lib/query/keys.ts src/features/zen/sessions.ts
git commit -F - <<'MSG'
feat: odak oturumu yazma ve gunluk toplam sorgusu

Kayit iyimser DEGIL: gosterilecek bir sey yok, oturum zaten bitti.
Hata oturumu kapatmayi engellemiyor - odaktan cikmayi aga baglamak
odak modunun yapabilecegi en kotu hata olurdu.

Gun siniri istemcide turetiliyor (0017 karariyla ayni).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

## Task 5: `sendBeacon` route handler

**Files:**
- Create: `src/app/api/focus-session/route.ts`

**Interfaces:**
- Consumes: Task 4'ten `FocusSessionDraft` gövde şekli.
- Produces: `POST /api/focus-session` — 204 (başarı), 400 (geçersiz gövde), 401 (oturum yok).

- [ ] **Step 1: Route'u yaz**

`src/app/api/focus-session/route.ts` oluştur:

```ts
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
 * `stamp_user_id()` trigger'ı zaten damgalıyor; buradaki oturum
 * kontrolü, kimliksiz bir isteğin sessizce düşmesi yerine açıkça
 * reddedilmesi için.
 *
 * ── Normal çıkışlar buraya UĞRAMAZ ──
 * Bitti / Çık / tur sonu mevcut desenle, `supabase-js` üzerinden
 * yazıyor. Burası yalnızca kapanışın kurtarma yolu.
 */
export async function POST(request: Request) {
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

interface ParsedDraft {
  taskId: string | null;
  taskTitle: string;
  mode: "free" | "pomodoro";
  startedAt: string;
  endedAt: string;
  netSeconds: number;
}

/**
 * Gövdeyi doğrular.
 *
 * Sınırdan gelen veriye güvenilmez (common/coding-style kuralı).
 * Doğrulama elle: şema kütüphanesi projede yok ve tek bir uç nokta
 * için eklemek orantısız olurdu.
 *
 * `netSeconds` üst sınırı 24 saat: daha büyük bir değer ya bir hata
 * ya da kasıtlı bir şişirme demek ve günlük toplamı anlamsız yapardı.
 */
function parseDraft(body: unknown): ParsedDraft | null {
  if (typeof body !== "object" || body === null) return null;

  const b = body as Record<string, unknown>;

  const taskId =
    b.taskId === null || typeof b.taskId === "string" ? b.taskId : undefined;
  if (taskId === undefined) return null;

  if (typeof b.taskTitle !== "string" || b.taskTitle.length === 0) return null;
  if (b.mode !== "free" && b.mode !== "pomodoro") return null;
  if (typeof b.startedAt !== "string") return null;
  if (typeof b.endedAt !== "string") return null;

  if (
    typeof b.netSeconds !== "number" ||
    !Number.isFinite(b.netSeconds) ||
    b.netSeconds < 0 ||
    b.netSeconds > 24 * 60 * 60
  ) {
    return null;
  }

  return {
    taskId,
    taskTitle: b.taskTitle,
    mode: b.mode,
    startedAt: b.startedAt,
    endedAt: b.endedAt,
    netSeconds: Math.floor(b.netSeconds),
  };
}
```

- [ ] **Step 2: Tip kontrolü ve lint**

Çalıştır: `npm run typecheck && npm run lint`
Beklenen: hata yok.

- [ ] **Step 3: Build'in geçtiğini doğrula**

Çalıştır: `npm run build`
Beklenen: başarılı; route listesinde `/api/focus-session` görünür.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/focus-session/route.ts
git commit -F - <<'MSG'
feat: sendBeacon kurtarma yolu icin route handler

Sayfa kapanirken supabase-js fetch'i iptal ediliyor; sendBeacon ise
ozel baslik kabul etmiyor. Ince bir route ikisini de cozuyor.

user_id istemciden GELMEZ, cerezdeki oturumdan okunur.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

## Task 6: `useFocusTimer` hook

**Files:**
- Create: `src/features/zen/useFocusTimer.ts`
- Delete: `src/features/zen/useZenTimer.ts`

**Interfaces:**
- Consumes: Task 1'den `startTimer`, `pauseTimer`, `resumeTimer`, `netSeconds`, `TimerState`.
- Produces:
  ```ts
  interface FocusTimer {
    seconds: number;          // net, duraklamalar düşülmüş
    paused: boolean;
    startedAtIso: string;     // kayıt için
    pause: () => void;
    resume: () => void;
    toggle: () => void;
  }
  function useFocusTimer(): FocusTimer
  ```
- `HIDDEN_PAUSE_THRESHOLD_MS = 60_000` (dosya içi sabit).

- [ ] **Step 1: Hook'u yaz**

`src/features/zen/useFocusTimer.ts` oluştur:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { netSeconds, pauseTimer, resumeTimer, startTimer } from "./zen";
import type { TimerState } from "./types";

/**
 * Sekme kaç milisaniye gizli kalırsa sayaç otomatik duraklar.
 *
 * 60 saniye: sekme değiştirip bir PDF'e bakmak odağın PARÇASI; on
 * dakika başka bir şey yapmak değil. Eşiksiz olsaydı her sekme
 * değişimi oturumu bölerdi.
 */
const HIDDEN_PAUSE_THRESHOLD_MS = 60_000;

export interface FocusTimer {
  /** Duraklamalar düşülmüş net süre, saniye. */
  seconds: number;
  paused: boolean;
  /** Oturumun başlangıç damgası — kayıt için. */
  startedAtIso: string;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
}

/**
 * Odak oturumunun sayacı.
 *
 * ── Neden `setInterval` ile sayı ARTIRMIYOR? ──
 * `count + 1` her saniyede bir birikimli hata biriktirir: tarayıcı
 * arka plandaki sekmede zamanlayıcıları kısıtlar (bazılarını dakikada
 * bire indirir) ve sayaç gerçek süreden sapar. Kullanıcı sekmeyi geri
 * açtığında yirmi dakikalık odağı "üç dakika" diye okurdu.
 *
 * Bunun yerine BAŞLANGIÇ DAMGASI tutuluyor ve her tik farkı YENİDEN
 * hesaplıyor. Zamanlayıcı ne kadar kısıtlanırsa kısıtlansın, bir
 * sonraki tikte doğru değere atlar.
 *
 * ── Otomatik duraklatma ──
 * Sekme `HIDDEN_PAUSE_THRESHOLD_MS`ten uzun gizli kalırsa, sayaç
 * GİZLENME ANINA geri dönülerek duraklatılıyor — yani kayıp süre net
 * değere hiç girmiyor. Kaydedilen sürenin gerçek olmasını bu sağlıyor
 * ve tablonun açılabilmesinin ön koşulu bu (bkz. `zen.ts`).
 */
export function useFocusTimer(): FocusTimer {
  /*
   * Başlangıç damgası ilk render'da BİR KEZ okunuyor (lazy initial
   * state). Efektin içinde okunsaydı ilk tik gelene kadar geçen süre
   * kaybolurdu.
   *
   * Sıfırlama sorunu YOK: `ZenScreen` yalnızca Zen açıkken takılıyor
   * ve çıkışta sökülüyor, yani hook her oturumda sıfırdan doğuyor.
   */
  const [state, setState] = useState<TimerState>(() => startTimer(Date.now()));
  const [seconds, setSeconds] = useState(0);

  /** Sekmenin gizlendiği an. Görünürken null. */
  const hiddenAtRef = useRef<number | null>(null);

  const pause = useCallback(() => {
    setState((s) => pauseTimer(s, Date.now()));
  }, []);

  const resume = useCallback(() => {
    setState((s) => resumeTimer(s, Date.now()));
  }, []);

  const toggle = useCallback(() => {
    setState((s) =>
      s.pausedAt === null
        ? pauseTimer(s, Date.now())
        : resumeTimer(s, Date.now()),
    );
  }, []);

  useEffect(() => {
    /*
     * Duraklatılmışken de tik ATIYOR ama `netSeconds` sabit döndüğü
     * için sayı donuyor. Zamanlayıcıyı durdurmak bir optimizasyon
     * olurdu; saniyede bir saf fonksiyon çağırmak zaten bedava ve
     * durdurmak, sürdürmede ilk tiki beklemek demekti.
     */
    const id = window.setInterval(() => {
      setSeconds(netSeconds(state, Date.now()));
    }, 1000);

    return () => window.clearInterval(id);
  }, [state]);

  /* Durum değişince (duraklat/sürdür) sayıyı ANINDA düzelt. */
  useEffect(() => {
    setSeconds(netSeconds(state, Date.now()));
  }, [state]);

  useEffect(() => {
    function onVisibility() {
      const now = Date.now();

      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = now;
        return;
      }

      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;

      if (hiddenAt === null) return;

      /*
       * Eşiği aşan gizlilik: sayacı GİZLENME ANINA duraklat, sonra
       * ŞİMDİ sürdür. İki adımın etkisi, aradaki tüm sürenin net
       * değerden düşülmesi.
       *
       * Eşik altındaysa hiçbir şey yapılmıyor — damga tabanlı sayaç
       * zaten doğru değere atlıyor.
       */
      if (now - hiddenAt >= HIDDEN_PAUSE_THRESHOLD_MS) {
        setState((s) => {
          if (s.pausedAt !== null) return s; // Kullanıcı zaten duraklatmış.
          return resumeTimer(pauseTimer(s, hiddenAt), now);
        });
        return;
      }

      /*
       * Sekme geri öne geldiğinde ANINDA düzelt: bir sonraki tiki
       * beklemek, kullanıcının yanlış bir sayı gördüğü bir saniye
       * bırakırdı ve o saniye tam da en çok bakılan an.
       */
      setSeconds(netSeconds(state, now));
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () =>
      document.removeEventListener("visibilitychange", onVisibility);
  }, [state]);

  return {
    seconds,
    paused: state.pausedAt !== null,
    startedAtIso: new Date(state.startedAt).toISOString(),
    pause,
    resume,
    toggle,
  };
}
```

- [ ] **Step 2: Eski hook'u sil**

```bash
git rm src/features/zen/useZenTimer.ts
```

- [ ] **Step 3: Tip kontrolü**

Çalıştır: `npm run typecheck`
Beklenen: **BİR hata** — `ZenScreen.tsx` hâlâ `useZenTimer` import ediyor. Bu beklenen; Task 7'de düzeliyor.

Geçici olarak `ZenScreen.tsx`'teki import satırını güncelle ki ağaç yeşil kalsın:

```ts
import { useFocusTimer } from "./useFocusTimer";
```

ve gövdedeki `const seconds = useZenTimer();` satırını:

```ts
const timer = useFocusTimer();
const seconds = timer.seconds;
```

- [ ] **Step 4: Tip kontrolü ve lint tekrar**

Çalıştır: `npm run typecheck && npm run lint && npm test`
Beklenen: hepsi PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/zen/useFocusTimer.ts src/features/zen/ZenScreen.tsx
git commit -F - <<'MSG'
feat: duraklatilabilir odak sayaci hook'u

useZenTimer yerine useFocusTimer. Damga tabanli tik korunuyor,
uzerine duraklatma ve 60 saniyelik sekme esigi eklendi: esigi asan
gizlilik, gizlenme anina donulerek net sureden dusuluyor.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

## Task 7: Alt bileşenler — mod seçici ve tur göstergesi

**Files:**
- Create: `src/features/zen/FocusModeToggle.tsx`
- Create: `src/features/zen/PomodoroDots.tsx`

**Interfaces:**
- Consumes: Task 2'den `POMODORO_PROFILES`, `ROUNDS_BEFORE_LONG_BREAK`; Task 1'den `FocusMode`, `PomodoroProfileId`.
- Produces:
  - `FocusModeToggle({ mode, profileId, onModeChange, onProfileChange })`
  - `PomodoroDots({ completedRounds })`
  - `const PROFILE_STORAGE_KEY = "zen.pomodoroProfile"`
  - `readStoredProfile(): PomodoroProfileId`
  - `storeProfile(id: PomodoroProfileId): void`

- [ ] **Step 1: `FocusModeToggle.tsx` yaz**

```tsx
"use client";

import { cn } from "@/lib/ui/cn";
import { POMODORO_PROFILES } from "./zen";
import type { FocusMode, PomodoroProfileId } from "./types";

export const PROFILE_STORAGE_KEY = "zen.pomodoroProfile";

/**
 * Kayıtlı pomodoro profili.
 *
 * `localStorage` erişimi TRY içinde: gizli sekmede ya da depolama
 * kapalıyken erişim FIRLATIYOR ve odak ekranının bu yüzden çökmesi
 * orantısız olurdu. Okunamazsa ilk profile düşüyor.
 */
export function readStoredProfile(): PomodoroProfileId {
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    const parsed = Number(raw);

    if (POMODORO_PROFILES.some((p) => p.id === parsed)) {
      return parsed as PomodoroProfileId;
    }
  } catch {
    // Depolama yok/kapalı — varsayılana düş.
  }

  return POMODORO_PROFILES[0].id;
}

/** Profili kaydeder. Yazılamazsa sessizce geçer — bkz. `readStoredProfile`. */
export function storeProfile(id: PomodoroProfileId): void {
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, String(id));
  } catch {
    // Yazılamadı; seçim bu oturum için geçerli kalır.
  }
}

/**
 * Mod ve süre profili seçici.
 *
 * ── Neden yalnızca oturum BAŞINDA görünüyor? ──
 * `ZenScreen`'in kuralı: "üçüncü bir seçenek eklemek modun kendisini
 * çürütür". Sayaç çalışırken görünen bir mod seçici, tam da o üçüncü
 * seçenek olurdu. Çağıran taraf sayaç başlayınca bunu SÖKÜYOR.
 */
export function FocusModeToggle({
  mode,
  profileId,
  onModeChange,
  onProfileChange,
}: {
  mode: FocusMode;
  profileId: PomodoroProfileId;
  onModeChange: (mode: FocusMode) => void;
  onProfileChange: (id: PomodoroProfileId) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        role="radiogroup"
        aria-label="Sayaç modu"
        className="flex items-center gap-1 rounded-lg border border-[var(--color-line)] p-1"
      >
        <ModeButton
          label="Serbest"
          selected={mode === "free"}
          onClick={() => onModeChange("free")}
        />
        <ModeButton
          label="Pomodoro"
          selected={mode === "pomodoro"}
          onClick={() => onModeChange("pomodoro")}
        />
      </div>

      {/*
        Profil seçimi yalnızca pomodoro seçiliyken: serbest modda
        anlamsız ve görünmesi "bu da mı bir karar?" diye sorduruyor.
      */}
      {mode === "pomodoro" && (
        <div
          role="radiogroup"
          aria-label="Pomodoro süresi"
          className="flex items-center gap-4"
        >
          {POMODORO_PROFILES.map((profile) => (
            <button
              key={profile.id}
              type="button"
              role="radio"
              aria-checked={profile.id === profileId}
              onClick={() => onProfileChange(profile.id)}
              className={cn(
                "text-[length:var(--text-sm)] tabular",
                "transition-colors duration-[var(--duration-fast)]",
                profile.id === profileId
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]",
              )}
            >
              {profile.id}
              <span className="sr-only">
                {` dakika odak, ${profile.shortBreakMin} dakika mola`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ModeButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center rounded-md px-3",
        "text-[length:var(--text-sm)]",
        "transition-colors duration-[var(--duration-fast)]",
        selected
          ? "bg-[var(--color-surface-2)] text-[var(--color-ink)]"
          : "text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]",
      )}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 2: `PomodoroDots.tsx` yaz**

```tsx
"use client";

import { cn } from "@/lib/ui/cn";
import { ROUNDS_BEFORE_LONG_BREAK } from "./zen";

/**
 * Uzun molaya kaç tur kaldığını gösteren noktalar.
 *
 * ── Neden sayı değil nokta? ──
 * "2/4" okunmayı gerektiriyor; dolu/boş noktalar tek bakışta
 * anlaşılıyor. Odak ekranında okunacak tek şey sayaç olmalı.
 *
 * Bu bir EYLEM değil, DURUM bildirimi — `ZenScreen`'in "üçüncü
 * seçenek" kuralını ihlal etmiyor.
 */
export function PomodoroDots({ completedRounds }: { completedRounds: number }) {
  /*
   * Döngü içindeki konum: 4 tur bitince sıfırlanıyor ve noktalar
   * yeni döngü için boşalıyor. Yoksa sekizinci turda sekiz nokta
   * çizmek gerekirdi.
   */
  const inCycle = completedRounds % ROUNDS_BEFORE_LONG_BREAK;
  const filled = inCycle === 0 && completedRounds > 0
    ? ROUNDS_BEFORE_LONG_BREAK
    : inCycle;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: ROUNDS_BEFORE_LONG_BREAK }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              "transition-colors duration-[var(--duration-base)]",
              i < filled
                ? "bg-[var(--color-accent)]"
                : "bg-[var(--color-line-2)]",
            )}
          />
        ))}
      </div>

      <span className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
        tur {filled}/{ROUNDS_BEFORE_LONG_BREAK}
      </span>
    </div>
  );
}
```

- [ ] **Step 3: Tip kontrolü ve lint**

Çalıştır: `npm run typecheck && npm run lint`
Beklenen: hata yok.

**Not:** Kullanılan tüm CSS değişkenleri `src/app/globals.css`te **doğrulandı** — `--color-surface-2` (94), `--color-ink-3` (102), `--color-ink-4` (104), `--color-line-2` (108), `--glow-accent-md` (185), `--z-modal` (395). Yeni değişken eklemek gerekmiyor.

- [ ] **Step 4: Commit**

```bash
git add src/features/zen/FocusModeToggle.tsx src/features/zen/PomodoroDots.tsx
git commit -F - <<'MSG'
feat: odak modu secici ve tur gostergesi

Mod secici yalnizca oturum basinda gorunuyor: sayac calisirken
gorunen bir secici, ZenScreen'in "ucuncu secenek modu curutur"
kuralini ihlal ederdi. Noktalar eylem degil DURUM bildiriyor.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

## Task 8: `ZenScreen` — akışı birleştir

**Files:**
- Modify: `src/features/zen/ZenScreen.tsx`
- Modify: `src/features/zen/zen.css`

**Interfaces:**
- Consumes: Task 1–7'nin tamamı.
- Produces: çalışan odak ekranı. Dışarıya yeni arayüz vermiyor (`ZenProvider` değişmiyor).

- [ ] **Step 1: `zen.css`'e durum sınıflarını ekle**

`src/features/zen/zen.css` sonuna:

```css
/*
 * Duraklatılmış sayaç: ışıma SÖNER ve renk soluklaşır.
 *
 * Durmuş bir sayacın nefes alması yalan söyler — nabız "zaman
 * geçiyor" diyor, oysa geçmiyor. Işımanın izinli olduğu dört yerden
 * biri bu sayaç ve duraklatıldığında o izin düşüyor.
 */
.zenTimer--paused {
  animation: none;
  text-shadow: none;
  color: var(--color-ink-3);
}

/*
 * Mola aşaması: ekran SAKİNLEŞİR.
 *
 * Renk değişimi tek bildirim — ses ve tarayıcı bildirimi bilerek yok
 * (izin akışı, odak ekranına ait olmayan bir kesinti olurdu).
 */
.zenScreen--break .zenTimer {
  color: var(--color-ink-2);
  animation: none;
  text-shadow: none;
}

@media (prefers-reduced-motion: reduce) {
  .zenTimer--paused {
    animation: none;
  }
}
```

- [ ] **Step 2: `ZenScreen.tsx`'i yeniden yaz**

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/ui/cn";
import { todayStr } from "@/lib/date/date";
import { useToggleTask } from "@/features/tasks/mutations";
import type { Task } from "@/features/tasks/types";
import { FocusModeToggle, readStoredProfile, storeProfile } from "./FocusModeToggle";
import { PomodoroDots } from "./PomodoroDots";
import {
  sendFocusSessionBeacon,
  useSaveFocusSession,
  useTodayFocusSeconds,
  type FocusSessionDraft,
} from "./sessions";
import { useFocusTimer } from "./useFocusTimer";
import {
  formatElapsed,
  nextPhase,
  phaseSeconds,
  profileById,
  remainingSeconds,
} from "./zen";
import type { FocusMode, Phase, PomodoroProfileId } from "./types";
import "./zen.css";

/**
 * Zen odak ekranı — tüm site kaybolur, tek iş kalır.
 *
 * ── Neden bu kadar boş? ──
 * Odak modunun tek işi dikkat dağıtıcıyı kaldırmak. Sekmeler, widget,
 * liste, ilerleme çubuğu: hepsi "başka bir şey de yapabilirsin"
 * diyor. Üçüncü bir SEÇENEK eklemek, modun kendisini çürütürdü.
 *
 * Eklenen her şey bu kuralı gözetiyor: mod seçici yalnızca oturum
 * BAŞLAMADAN önce görünüyor, noktalar ve "bugün toplam" ise eylem
 * değil DURUM bildiriyor. Yeni eylem tek: Duraklat — ve o da kaçış
 * yolu değil, kaydedilen sürenin gerçek olmasını sağlayan araç.
 *
 * ── Sayaç artık KAYDEDİLİYOR ──
 * Gerekçe `zen.ts`te: duraklatma ve sekme koruması eklendiği için
 * ölçülen şey artık çalışılan süreye yaklaşıyor.
 */
export function ZenScreen({
  task,
  onExit,
}: {
  task: Task;
  onExit: () => void;
}) {
  const timer = useFocusTimer();
  const toggleTask = useToggleTask();
  const saveSession = useSaveFocusSession();

  const [mode, setMode] = useState<FocusMode>("free");
  const [profileId, setProfileId] = useState<PomodoroProfileId>(25);
  const [phase, setPhase] = useState<Phase>("focus");
  const [completedRounds, setCompletedRounds] = useState(0);
  /** Sayaç bir kez başladıysa mod seçici bir daha görünmez. */
  const [started, setStarted] = useState(false);

  const today = todayStr();
  const todayTotal = useTodayFocusSeconds(today);

  /* Kayıtlı profil ilk render'dan SONRA: `localStorage` sunucuda yok. */
  useEffect(() => {
    setProfileId(readStoredProfile());
  }, []);

  const profile = profileById(profileId);
  const phaseTotal = phaseSeconds(profile, phase);
  const remaining = remainingSeconds(phaseTotal, timer.seconds);
  const phaseDone = mode === "pomodoro" && remaining === 0;

  /* Sayaç ilerlemeye başlayınca mod seçici sökülür. */
  useEffect(() => {
    if (timer.seconds > 0) setStarted(true);
  }, [timer.seconds]);

  /**
   * Kayıt taslağı — ref'te tutuluyor.
   *
   * Kapanış dinleyicisi (`visibilitychange`) bu değerleri OKUMAK
   * zorunda ve bağımlılık olarak geçseydi dinleyici her saniye
   * yeniden bağlanırdı.
   */
  const draftRef = useRef<FocusSessionDraft | null>(null);
  draftRef.current = {
    taskId: task.id,
    taskTitle: task.title,
    mode,
    startedAt: timer.startedAtIso,
    endedAt: new Date().toISOString(),
    netSeconds: timer.seconds,
  };

  /** Oturumu kaydedip sayacı bırakır. Sıfır süre YAZILMAZ. */
  const persist = useCallback(() => {
    const draft = draftRef.current;
    if (draft === null || draft.netSeconds === 0) return;

    saveSession.mutate({ ...draft, endedAt: new Date().toISOString() });
  }, [saveSession]);

  /* Esc çıkar — tam ekran bir katmanın en beklenen kısayolu. */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      persist();
      onExit();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit, persist]);

  /*
   * Zen açıkken ARKA SAYFA kaydırılamaz.
   *
   * Katman `fixed` ve tam ekran; altındaki sayfa kaydırılırsa
   * kullanıcı çıktığında bambaşka bir yerde buluyor kendini. Odak
   * modunun sözü "çıktığında bıraktığın yerdesin".
   */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  /*
   * Sayfa kapanırken oturumu KURTAR.
   *
   * `beforeunload` DEĞİL: mobil tarayıcılarda güvenilir
   * tetiklenmiyor. `sendBeacon` sayfa öldükten sonra da gönderiyor
   * (bkz. `sessions.ts`).
   */
  useEffect(() => {
    function onHidden() {
      if (document.visibilityState !== "hidden") return;

      const draft = draftRef.current;
      if (draft === null || draft.netSeconds === 0) return;

      sendFocusSessionBeacon({
        ...draft,
        endedAt: new Date().toISOString(),
      });
    }

    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, []);

  function handleDone() {
    persist();
    toggleTask.mutate({ id: task.id, done: true });
    onExit();
  }

  function handleExit() {
    persist();
    onExit();
  }

  /**
   * Biten aşamadan sonrakine geçer.
   *
   * Geri sayım bitince OTOMATİK çağrılmıyor — kullanıcı basıyor.
   * Otomatik geçiş, masa başından kalkmış kullanıcının molasını
   * sessizce tüketirdi.
   */
  function handleNextPhase() {
    const rounds = phase === "focus" ? completedRounds + 1 : completedRounds;

    /* Yalnızca ODAK turu kaydedilir; mola satırı yok (0021). */
    if (phase === "focus") persist();

    setCompletedRounds(rounds);
    setPhase(nextPhase(phase, rounds));
    /* Yeni aşama sıfırdan başlasın diye ekran yeniden takılır. */
    setStarted(false);
  }

  const shown = mode === "pomodoro" ? remaining : timer.seconds;
  const isBreak = phase !== "focus";

  return (
    <div
      /*
       * `key`: aşama değişince tüm alt ağaç (ve `useFocusTimer`)
       * sıfırdan doğsun. Sayacı elle sıfırlamak, hook'un "her oturumda
       * sıfırdan doğar" sözleşmesini bozardı.
       */
      key={`${phase}-${completedRounds}`}
      role="dialog"
      aria-modal="true"
      aria-label="Odak modu"
      className={cn(
        "zenScreen fixed inset-0 z-[var(--z-modal)]",
        isBreak && "zenScreen--break",
        "flex flex-col items-center justify-center gap-8 px-6",
        "bg-[var(--color-bg)]",
      )}
    >
      <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-[0.12em] text-[var(--color-ink-4)]">
        {phase === "focus" ? "Odak" : "Mola"}
      </p>

      <h1 className="max-w-2xl text-center text-[length:var(--text-3xl)] font-semibold leading-tight tracking-[-0.02em] break-words">
        {task.title}
      </h1>

      {!started && !isBreak && (
        <FocusModeToggle
          mode={mode}
          profileId={profileId}
          onModeChange={setMode}
          onProfileChange={(id) => {
            setProfileId(id);
            storeProfile(id);
          }}
        />
      )}

      {/*
        Sayaç turuncu ve ışıklı: ekrandaki tek hareketli şey ve
        ışımanın izinli olduğu dört yerden biri. `tabular` şart —
        değişen rakamlar sayıyı her saniye yatay olarak oynatırdı.
      */}
      <p
        className={cn(
          "zenTimer tabular text-[length:var(--text-3xl)] font-semibold",
          "text-[var(--color-accent)]",
          timer.paused && "zenTimer--paused",
        )}
        aria-live="off"
      >
        {formatElapsed(shown)}
      </p>

      {mode === "pomodoro" && <PomodoroDots completedRounds={completedRounds} />}

      {phaseDone ? (
        <button
          type="button"
          onClick={handleNextPhase}
          className={cn(
            "inline-flex h-11 items-center rounded-lg px-5",
            "text-[length:var(--text-sm)] font-medium",
            "bg-[var(--color-accent)] text-[var(--color-on-accent)]",
            "transition-shadow duration-[var(--duration-fast)]",
            "hover:shadow-[var(--glow-accent-md)]",
          )}
        >
          {phase === "focus" ? "Molaya geç" : "Odağa dön"}
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={timer.toggle}
            className={cn(
              "inline-flex h-11 items-center rounded-lg px-4",
              "text-[length:var(--text-sm)] text-[var(--color-ink-2)]",
              "transition-colors duration-[var(--duration-fast)]",
              "hover:text-[var(--color-ink)]",
            )}
          >
            {timer.paused ? "Sürdür" : "Duraklat"}
          </button>

          <button
            type="button"
            onClick={handleDone}
            className={cn(
              "inline-flex h-11 items-center rounded-lg px-5",
              "text-[length:var(--text-sm)] font-medium",
              "bg-[var(--color-accent)] text-[var(--color-on-accent)]",
              "transition-shadow duration-[var(--duration-fast)]",
              "hover:shadow-[var(--glow-accent-md)]",
            )}
          >
            Bitti
          </button>

          <button
            type="button"
            onClick={handleExit}
            className={cn(
              "inline-flex h-11 items-center rounded-lg px-4",
              "text-[length:var(--text-sm)] text-[var(--color-ink-2)]",
              "transition-colors duration-[var(--duration-fast)]",
              "hover:text-[var(--color-ink)]",
            )}
          >
            Çık
          </button>
        </div>
      )}

      {/*
        Bugünün toplamı: bir EYLEM değil, durum. Sayacın altında ve
        küçük — okunması gereken sayı hâlâ sayaç.
      */}
      {todayTotal.data !== undefined && todayTotal.data > 0 && (
        <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
          bugün {formatElapsed(todayTotal.data)} odaklandın
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Tip kontrolü, lint, test**

Çalıştır: `npm run typecheck && npm run lint && npm test`
Beklenen: hepsi PASS.

- [ ] **Step 4: Build**

Çalıştır: `npm run build`
Beklenen: başarılı.

- [ ] **Step 5: Elle doğrula**

`npm run dev` çalıştır, tarayıcıda:

1. Bugün ekranından odak kartındaki Zen düğmesine bas → ekran açılır, mod seçici görünür, sayaç `0:00`.
2. Birkaç saniye bekle → sayaç ilerler, mod seçici **kaybolur**.
3. **Duraklat**'a bas → sayaç durur, ışıma söner, renk soluklaşır. Düğme "Sürdür" olur.
4. **Sürdür** → sayaç kaldığı yerden devam eder (duraklama süresi **sayılmaz**).
5. **Çık** → ekran kapanır. Supabase'de doğrula:
   ```sql
   select task_title, mode, net_seconds, started_at from public.focus_sessions
   order by started_at desc limit 5;
   ```
   Beklenen: bir satır, `net_seconds` duraklama hariç süreye eşit.
6. Tekrar aç → sayacın altında "bugün X odaklandın" görünür.
7. **Pomodoro** seç → `25 · 50 · 90` görünür, `25`'e bas, sayaç `25:00`'ten **geri** sayar, noktalar `tur 0/4`.
8. Sayfayı yenile → profil seçimi **korunur** (`localStorage`).

- [ ] **Step 6: Commit**

```bash
git add src/features/zen/ZenScreen.tsx src/features/zen/zen.css
git commit -F - <<'MSG'
feat: odak ekraninda pomodoro, duraklatma ve bugun toplami

Mod secici sayac baslayinca sokuluyor; noktalar ve gunluk toplam
eylem degil durum bildiriyor. Duraklatilmis sayacin isimasi soner -
durmus bir sayacin nefes almasi yalan soylerdi.

Sayfa kapanisi sendBeacon ile kurtariliyor, sifir sureli oturum
yazilmiyor.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

## Doğrulama Özeti

Plan tamamlandığında geçmesi gerekenler:

```bash
npm test          # zen.test.ts dahil tüm testler
npm run typecheck # hata yok
npm run lint      # hata yok
npm run build     # /api/focus-session route listesinde
```

Ve spec'teki her madde karşılanmış olur:

| Spec bölümü | Görev |
|---|---|
| 2 — gerekçe yeniden yazımı | Task 1 Step 4 |
| 3 — katman ayrımı | Task 1, 4, 6, 7, 8 |
| 4 — tablo, RLS, trigger | Task 3 |
| 4.5 — sendBeacon + route | Task 4, 5 |
| 5.1 — net süre | Task 1 |
| 5.2 — sekme koruması (60 sn) | Task 6 |
| 5.3 — üç profil, otomatik geçiş yok | Task 2, 7, 8 |
| 5.4 — yalnızca görsel | Task 8 Step 1 |
| 6 — ekran | Task 7, 8 |
| 7 — testler | Task 1, 2 |
| 8 — hata yönetimi | Task 4, 8 |
