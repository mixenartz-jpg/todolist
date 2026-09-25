"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/ui/cn";
import { todayStr } from "@/lib/date/date";
import { useToggleTask } from "@/features/tasks/mutations";
import type { Task } from "@/features/tasks/types";
import {
  FocusModeToggle,
  readStoredProfile,
  storeProfile,
} from "./FocusModeToggle";
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
 *
 * ── Aşama başına YENİDEN takılıyor ──
 * Dışarıdaki `ZenPhase` sarmalayıcısı `key` taşıyor; aşama değişince
 * bu bileşen (ve `useFocusTimer`) sıfırdan doğuyor. Sayacı elle
 * sıfırlamak, hook'un "her oturumda sıfırdan doğar" sözleşmesini
 * bozardı.
 */
export function ZenScreen({
  task,
  onExit,
  onSaveError,
}: {
  task: Task;
  onExit: () => void;
  /**
   * Kayıt başarısız oldu.
   *
   * Uyarıyı Zen'in KENDİSİ gösteremez: `onExit` ekranı anında söküyor
   * ve buradaki bir toast hiç görünmezdi. Sağlayıcı (`ZenProvider`)
   * Zen kapandıktan sonra da ayakta ve mesajı orada gösteriyor.
   */
  onSaveError: (message: string) => void;
}) {
  const [mode, setMode] = useState<FocusMode>("free");
  const [phase, setPhase] = useState<Phase>("focus");
  const [completedRounds, setCompletedRounds] = useState(0);

  /*
   * Kayıtlı profil LAZY INITIAL STATE ile okunuyor, efektle değil.
   *
   * `ZenScreen` yalnızca Zen açıkken (istemcide, bir tıklamadan
   * sonra) takılıyor — sunucuda hiç render edilmiyor, yani
   * `localStorage`'a ilk render'da erişmek güvenli. Efektten okumak
   * bir render turu daha isterdi ve ilk karede yanlış profil
   * görünürdü.
   */
  const [profileId, setProfileId] = useState<PomodoroProfileId>(
    readStoredProfile,
  );

  /*
   * Kaç kez BÖLÜNDÜ — sekme gizlenip oturum kurtarıldığında artıyor.
   *
   * Turu değiştirmiyor, yalnızca anahtarı değiştirip sayacı sıfırdan
   * doğuruyor: gönderilen süre ikinci kez sayılmasın, geri dönen
   * kullanıcının yeni süresi de kaybolmasın.
   */
  const [splits, setSplits] = useState(0);
  const handleSplit = useCallback(() => setSplits((n) => n + 1), []);

  function handlePhaseEnd() {
    const rounds = phase === "focus" ? completedRounds + 1 : completedRounds;
    setCompletedRounds(rounds);
    setPhase(nextPhase(phase, rounds));
  }

  return (
    <ZenPhase
      /*
       * Aşama, tur ve bölüm birlikte anahtar: aynı aşamaya geri
       * dönüldüğünde (odak → mola → odak) tur değiştiği için anahtar
       * yine yeni ve sayaç yine sıfırdan doğuyor.
       */
      key={`${phase}-${completedRounds}-${splits}`}
      task={task}
      mode={mode}
      phase={phase}
      profileId={profileId}
      completedRounds={completedRounds}
      onModeChange={setMode}
      onProfileChange={(id) => {
        setProfileId(id);
        storeProfile(id);
      }}
      onPhaseEnd={handlePhaseEnd}
      onSplit={handleSplit}
      onSaveError={onSaveError}
      onExit={onExit}
    />
  );
}

/**
 * Tek bir aşamanın ekranı.
 *
 * Sayaç burada yaşıyor ve `key` değişimiyle sıfırlanıyor — durum
 * sıfırlama mantığı yerine React'in kendi kuralı kullanılıyor.
 */
function ZenPhase({
  task,
  mode,
  phase,
  profileId,
  completedRounds,
  onModeChange,
  onProfileChange,
  onPhaseEnd,
  onSplit,
  onSaveError,
  onExit,
}: {
  task: Task;
  mode: FocusMode;
  phase: Phase;
  profileId: PomodoroProfileId;
  completedRounds: number;
  onModeChange: (mode: FocusMode) => void;
  onProfileChange: (id: PomodoroProfileId) => void;
  onPhaseEnd: () => void;
  /** Sekme gizlenip oturum kurtarıldı; sayaç sıfırdan başlamalı. */
  onSplit: () => void;
  onSaveError: (message: string) => void;
  onExit: () => void;
}) {
  const timer = useFocusTimer();
  const toggleTask = useToggleTask();
  const saveSession = useSaveFocusSession(onSaveError);

  const today = todayStr();
  const todayTotal = useTodayFocusSeconds(today);

  /*
   * Sayaç ilerlediyse mod seçici bir daha görünmez.
   *
   * Ayrı bir state'e gerek YOK: sayaç geri saymıyor, yani `> 0`
   * olduktan sonra bir daha sıfıra dönmüyor. Bunu state'te tutmak,
   * aynı gerçeği iki yerde saklamak olurdu.
   */
  const started = timer.seconds > 0;

  const profile = profileById(profileId);
  const isBreak = phase !== "focus";
  const countdown = mode === "pomodoro";

  const phaseTotal = phaseSeconds(profile, phase);
  const remaining = remainingSeconds(phaseTotal, timer.seconds);
  const phaseDone = countdown && remaining === 0;

  /**
   * Kayıt taslağı — ref'te tutuluyor.
   *
   * Kapanış dinleyicisi (`visibilitychange`) bu değerleri OKUMAK
   * zorunda; bağımlılık olarak geçseydi dinleyici her saniye yeniden
   * bağlanırdı.
   *
   * `endedAt` burada YAZILMIYOR: taslak her saniye tazeleniyor ve o
   * andaki "şimdi"yi saklamak, kaydın gerçek bitiş anını değil son
   * tikin anını yazardı. Bitiş damgası kaydeden tarafta üretiliyor.
   */
  const draftRef = useRef<Omit<FocusSessionDraft, "endedAt">>({
    taskId: task.id,
    taskTitle: task.title,
    mode,
    startedAt: timer.startedAtIso,
    netSeconds: 0,
  });

  useEffect(() => {
    draftRef.current = {
      taskId: task.id,
      taskTitle: task.title,
      mode,
      startedAt: timer.startedAtIso,
      netSeconds: timer.seconds,
    };
  }, [task.id, task.title, mode, timer.startedAtIso, timer.seconds]);

  /**
   * Oturumu kaydeder.
   *
   * Sıfır süre YAZILMAZ: açılıp hemen kapatılan bir ekran, "0 saniye
   * odaklandım" diye bir satır bırakmamalı.
   *
   * MOLA da yazılmaz — tablo yalnızca odak turlarını tutuyor (0021).
   */
  /**
   * Bu aşamanın turu KAYDEDİLDİ mi?
   *
   * ── Neden gerekli? ──
   * İki yol aynı turu yazabiliyor: `persist` (Bitti/Çık/Esc/tur sonu)
   * ve `sendFocusSessionBeacon` (sekme kapanışı). İkisi arka arkaya
   * çalışabilir — kullanıcı "Çık"a basıp sekmeyi kapatırsa, ya da
   * sekmeyi gizleyip geri gelip "Çık"a basarsa — ve aynı oturum
   * tabloya İKİ satır olarak düşerdi. Günlük toplam o turu iki kez
   * sayardı.
   *
   * State DEĞİL ref: bayrağın render'ı etkilemesi gerekmiyor ve
   * `visibilitychange` dinleyicisinin onu anında görmesi gerekiyor.
   */
  const savedRef = useRef(false);

  const persist = useCallback(() => {
    const draft = draftRef.current;
    if (savedRef.current) return;
    if (draft.netSeconds === 0) return;
    if (phase !== "focus") return;

    savedRef.current = true;
    saveSession.mutate({ ...draft, endedAt: new Date().toISOString() });
  }, [phase, saveSession]);

  function handleExit() {
    persist();
    onExit();
  }

  function handleDone() {
    persist();
    toggleTask.mutate({ id: task.id, done: true });
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
    persist();
    onPhaseEnd();
  }

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
   * Sekme gizlenince oturumu KURTAR.
   *
   * ── Neden `beforeunload` değil? ──
   * Mobil tarayıcılarda güvenilir tetiklenmiyor. `sendBeacon` sayfa
   * öldükten sonra da gönderiyor (gerekçenin tamamı `sessions.ts`te).
   *
   * ── Gizlenme KAPANMA demek değil ──
   * Başka bir sekmeye geçmek de `hidden` tetikliyor ve kullanıcı geri
   * dönüp çalışmaya devam edebilir. Bu yüzden gönderimden sonra sayaç
   * SIFIRLANIYOR (`onSplit`): geri dönen kullanıcının yeni süresi
   * ayrı bir tur olarak yazılıyor ve hiçbir saniye kaybolmuyor.
   *
   * Turun ikiye bölünmesi kabul edilebilir bir maliyet: alternatifi
   * ya kaydı kilitleyip sonraki süreyi kaybetmek, ya da kilidi hiç
   * koymayıp aynı süreyi iki kez saymaktı.
   */
  useEffect(() => {
    function onHidden() {
      if (document.visibilityState !== "hidden") return;
      if (phase !== "focus") return;

      /*
       * `persist` bu turu zaten yazdıysa DOKUNMA: kullanıcı "Çık"a
       * basıp hemen sekmeyi kapatırsa aynı oturum iki satır olurdu.
       */
      if (savedRef.current) return;

      const draft = draftRef.current;
      if (draft.netSeconds === 0) return;

      sendFocusSessionBeacon({
        ...draft,
        endedAt: new Date().toISOString(),
      });

      onSplit();
    }

    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, [phase, onSplit]);

  const shown = countdown ? remaining : timer.seconds;

  return (
    <div
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
        {isBreak ? "Mola" : "Odak"}
      </p>

      <h1 className="max-w-2xl text-center text-[length:var(--text-3xl)] font-semibold leading-tight tracking-[-0.02em] break-words">
        {task.title}
      </h1>

      {!started && !isBreak && (
        <FocusModeToggle
          mode={mode}
          profileId={profileId}
          onModeChange={onModeChange}
          onProfileChange={onProfileChange}
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

      {countdown && <PomodoroDots completedRounds={completedRounds} />}

      {phaseDone ? (
        <button
          type="button"
          onClick={handleNextPhase}
          className={cn(
            "inline-flex h-11 items-center rounded-lg px-5",
            "text-[length:var(--text-sm)] font-medium",
            "bg-[var(--color-accent-fill)] text-[var(--color-on-accent)]",
            "transition-shadow duration-[var(--duration-fast)]",
            "hover:shadow-[var(--glow-accent-md)]",
          )}
        >
          {isBreak ? "Odağa dön" : "Molaya geç"}
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
              "bg-[var(--color-accent-fill)] text-[var(--color-on-accent)]",
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
