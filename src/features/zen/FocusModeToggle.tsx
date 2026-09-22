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
 * orantısız olurdu. Okunamazsa ilk profile düşüyor — `profileById`
 * ile aynı disiplin.
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
                "tabular text-[length:var(--text-sm)]",
                "transition-colors duration-[var(--duration-fast)]",
                profile.id === profileId
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]",
              )}
            >
              {profile.id}
              {/*
                Görsel etiket yalnızca bir sayı ("25") ve ekran
                okuyucuda anlamsız kalırdı. Mola süresi de burada
                söyleniyor çünkü profilin ayırt edici yanı o.
              */}
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
