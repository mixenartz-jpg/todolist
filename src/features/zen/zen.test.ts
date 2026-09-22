import { describe, expect, it } from "vitest";
import {
  POMODORO_PROFILES,
  ROUNDS_BEFORE_LONG_BREAK,
  elapsedSeconds,
  formatElapsed,
  netSeconds,
  nextPhase,
  pauseTimer,
  phaseSeconds,
  profileById,
  remainingSeconds,
  resumeTimer,
  startTimer,
} from "./zen";
import type { Phase } from "./types";

describe("formatElapsed", () => {
  it("sıfırı 0:00 yazar", () => {
    expect(formatElapsed(0)).toBe("0:00");
  });

  it("saniyeyi iki hane doldurur", () => {
    expect(formatElapsed(5)).toBe("0:05");
    expect(formatElapsed(65)).toBe("1:05");
  });

  it("dakikayı bir saate kadar sade yazar", () => {
    expect(formatElapsed(59 * 60 + 59)).toBe("59:59");
  });

  /*
   * "0:05:12" ilk bakışta beş saat gibi okunuyor; odak ekranında tek
   * iş sayının anında anlaşılması.
   */
  it("bir saatin altında saat hanesi YAZMAZ", () => {
    expect(formatElapsed(312)).toBe("5:12");
  });

  it("bir saati geçince saat hanesi açılır", () => {
    expect(formatElapsed(3600)).toBe("1:00:00");
    expect(formatElapsed(3661)).toBe("1:01:01");
  });

  it("negatifi sıfır sayar", () => {
    expect(formatElapsed(-10)).toBe("0:00");
  });

  it("kesirli saniyeyi aşağı yuvarlar", () => {
    expect(formatElapsed(9.9)).toBe("0:09");
  });
});

describe("elapsedSeconds", () => {
  it("iki damga arasını saniyeye çevirir", () => {
    expect(elapsedSeconds(1_000_000, 1_005_000)).toBe(5);
  });

  it("bir saniyenin altını sıfır sayar", () => {
    expect(elapsedSeconds(1_000_000, 1_000_900)).toBe(0);
  });

  /*
   * Sistem saati geri alınırsa (yaz saati, NTP düzeltmesi) sayaç
   * geriye sayıp "-3:12" gösterirdi.
   */
  it("saat geri alınırsa sıfırda durur", () => {
    expect(elapsedSeconds(1_005_000, 1_000_000)).toBe(0);
  });
});

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

  /*
   * Saat duraklamanın ORTASINDA geri alınırsa negatif bir duraklama
   * süresi birikir ve net süre gerçekte olduğundan UZUN görünürdü.
   */
  it("duraklama süresi negatifse sıfır sayar", () => {
    const started = startTimer(0);
    const paused = pauseTimer(started, 10_000);
    const resumed = resumeTimer(paused, 5_000); // saat geri alındı

    expect(resumed.pausedTotalMs).toBe(0);
  });
});

describe("POMODORO_PROFILES", () => {
  it("üç profil tanımlar", () => {
    expect(POMODORO_PROFILES.map((p) => p.id)).toEqual([25, 50, 90]);
  });

  it("spec'teki süreleri taşır", () => {
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
  it("dakikayı saniyeye çevirir", () => {
    const p = profileById(25);
    expect(phaseSeconds(p, "focus")).toBe(25 * 60);
    expect(phaseSeconds(p, "shortBreak")).toBe(5 * 60);
    expect(phaseSeconds(p, "longBreak")).toBe(15 * 60);
  });

  it("90 profilinde de doğru", () => {
    const p = profileById(90);
    expect(phaseSeconds(p, "focus")).toBe(5400);
    expect(phaseSeconds(p, "longBreak")).toBe(1800);
  });
});

describe("nextPhase", () => {
  it("odaktan sonra kısa mola gelir", () => {
    expect(nextPhase("focus", 1)).toBe("shortBreak");
    expect(nextPhase("focus", 2)).toBe("shortBreak");
    expect(nextPhase("focus", 3)).toBe("shortBreak");
  });

  it("dördüncü turdan sonra UZUN mola gelir", () => {
    expect(nextPhase("focus", ROUNDS_BEFORE_LONG_BREAK)).toBe("longBreak");
    expect(nextPhase("focus", 8)).toBe("longBreak");
  });

  it("her iki moladan sonra odağa döner", () => {
    expect(nextPhase("shortBreak", 1)).toBe("focus");
    expect(nextPhase("longBreak", 4)).toBe("focus");
  });

  /* Tam döngü: odak-kısa-odak-kısa-odak-kısa-odak-UZUN */
  it("tam döngüyü doğru sırayla yürütür", () => {
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
  it("kalan süreyi verir", () => {
    expect(remainingSeconds(1500, 100)).toBe(1400);
  });

  it("süre dolunca sıfır verir", () => {
    expect(remainingSeconds(1500, 1500)).toBe(0);
  });

  /* Sekme arka planda kalıp tik atlanırsa elapsed hedefi AŞABİLİR. */
  it("hedefi aşan elapsed'de sıfırda durur", () => {
    expect(remainingSeconds(1500, 1900)).toBe(0);
  });
});
