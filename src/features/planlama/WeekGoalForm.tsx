"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { useRevealOnMount } from "@/lib/ui/useRevealOnMount";
import { startOfMonth } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { ColorSlotPicker } from "./ColorSlotPicker";
import { GoalPicker } from "./GoalPicker";
import { goalPickerOptions } from "./goaloptions";
import { usePlanGoals } from "./queries";
import {
  GOAL_NOTE_MAX,
  GOAL_TITLE_MAX,
  normalizeGoalTitle,
  parseTargetCount,
} from "./goal";
import type { WeekGoal, WeekGoalDraft } from "./types";

interface WeekGoalFormProps {
  weekStart: DateStr;
  /** Düzenleme modunda mevcut hedef; yoksa yeni hedef formu. */
  initial?: WeekGoal;
  sortOrder: number;
  pending: boolean;
  onSubmit: (draft: WeekGoalDraft) => void;
  onCancel?: () => void;
}

/**
 * Haftalık hedef oluşturma ve düzenleme formu.
 *
 * `GoalForm`'un ikizi, tek farkı sayısal hedefin BOŞ bırakılmasının ne
 * demek olduğu. Aylık hedefte boş bırakmak "ilerlemeyi bağlı
 * görevlerden oku" demekti; burada görev bağı yok, dolayısıyla boş
 * hedef "sayaçsız, elle işaretlenen hedef" anlamına gelir. Yardım
 * metni bu yüzden farklı yazıyor — aynı alan, iki ekranda iki ayrı şey
 * yapıyor ve kullanıcı hangisinde olduğunu okuyabilmeli.
 */
export function WeekGoalForm({
  weekStart,
  initial,
  sortOrder,
  pending,
  onSubmit,
  onCancel,
}: WeekGoalFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  // Açılınca düğmeleriyle birlikte ekrana gelsin (bkz. useRevealOnMount).
  const formRef = useRef<HTMLFormElement>(null);
  useRevealOnMount(formRef);
  const [note, setNote] = useState(initial?.note ?? "");
  const [target, setTarget] = useState(
    initial?.targetCount === null || initial?.targetCount === undefined
      ? ""
      : String(initial.targetCount),
  );
  const [colorSlot, setColorSlot] = useState(initial?.colorSlot ?? 0);
  const [planGoalId, setPlanGoalId] = useState(initial?.planGoalId ?? null);

  /*
   * Bağlanabilecek aylık hedefler, HAFTANIN ayından.
   *
   * Hafta iki ayı birden kesebilir (ör. 29 Eylül – 5 Ekim); o zaman
   * pazartesinin ayı seçilir. Alternatif ikisini birden listelemekti
   * ama o, kullanıcıya "bu hedef hangi ayda ölçülüyor" sorusunu her
   * seferinde sordurur; hafta bir aya AİT sayılır ve o ay
   * pazartesininkidir (`week_start` zaten pazartesiye sabitli).
   */
  const monthGoals = usePlanGoals(startOfMonth(weekStart));

  /*
   * Seçici çizilsin mi? Karar `goalPickerOptions`'a BIRAKILIR, ham
   * listenin boş olup olmamasına DEĞİL.
   *
   * Fark hafta iki ayı kestiğinde ortaya çıkar: bağ öteki ayın
   * hedefine bakıyorsa ve pazartesinin ayında hiç hedef yoksa, ham
   * listeye bakan bir koşul seçiciyi tamamen gizler — kullanıcı var
   * olan bağı ne görebilir ne kaldırabilirdi. `GoalPicker` o durumu
   * zaten "Başka ayın hedefi" diye gösteriyor (bkz. goaloptions.ts).
   */
  const pickerState = goalPickerOptions(monthGoals.data ?? [], planGoalId);
  const showGoalPicker =
    pickerState.options.length > 0 || pickerState.orphan;

  const normalizedTitle = normalizeGoalTitle(title);
  const parsedTarget = parseTargetCount(target);
  // `undefined` = bozuk girdi (bkz. goal.ts'in üç durumlu sözleşmesi).
  const targetInvalid = parsedTarget === undefined;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (normalizedTitle === null || targetInvalid) return;

    onSubmit({
      weekStart,
      title: normalizedTitle,
      note: note.trim() ? note.trim() : null,
      targetCount: parsedTarget,
      colorSlot,
      sortOrder,
      planGoalId,
    });

    /*
     * Yeni hedef modunda alanlar temizlenir.
     *
     * Bugün her iki çağıran da gönderimden sonra formu KAPATIYOR
     * (`setAdding(false)` / `setEditing(false)`), yani bu temizlik
     * pratikte görülmez — form zaten sökülüyor. Yine de duruyor:
     * çağıranın formu açık bırakması tamamen makul bir seçim ve o
     * gün geldiğinde bir önceki hedefin başlığı kutuda kalsaydı,
     * kullanıcı farkında olmadan aynı metni ikinci kez kaydederdi.
     *
     * `planGoalId` bilerek KORUNUR: art arda dilim yazılan senaryoda
     * ay hedefi değişmez ve her seferinde yeniden seçtirmek gereksiz
     * iş olurdu.
     */
    if (!initial) {
      setTitle("");
      setNote("");
      setTarget("");
    }
  }

  return (
    <form
      ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={GOAL_TITLE_MAX}
        placeholder="Bu hafta ne yapacaksın?"
        aria-label="Hedef başlığı"
        className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[length:var(--text-base)] placeholder:text-[var(--color-ink-3)]"
      />

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={GOAL_NOTE_MAX}
        rows={2}
        placeholder="Ayrıntı (isteğe bağlı)"
        aria-label="Hedef ayrıntısı"
        className="w-full resize-y rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[length:var(--text-sm)] leading-relaxed placeholder:text-[var(--color-ink-3)]"
      />

      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-[length:var(--text-xs)] text-[var(--color-ink-2)]">
          Sayısal hedef
          <input
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            inputMode="numeric"
            placeholder="3"
            aria-invalid={targetInvalid}
            className="tabular w-20 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-[length:var(--text-sm)] placeholder:text-[var(--color-ink-3)]"
          />
        </label>

        {targetInvalid ? (
          <p
            role="alert"
            className="text-[length:var(--text-xs)] text-[var(--color-warn)]"
          >
            1 ile 9999 arasında bir tam sayı yaz.
          </p>
        ) : (
          /* Boş bırakmanın ne anlama geldiğini YAZAR — GoalForm'daki
             ile aynı gerekçe, farklı sonuç: burada görev bağı yok. */
          <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            Boş bırakırsan sayaç olmaz; hedefi bitirince kutucuğu
            işaretlersin.
          </p>
        )}
      </div>

      {/* Aylık hedefe bağlama: bu haftalık hedef hangi ay hedefinin
          dilimi? İsteğe bağlı — görünürlük gerekçesi yukarıda. */}
      {showGoalPicker && (
        <label className="flex items-center gap-2 text-[length:var(--text-xs)] text-[var(--color-ink-2)]">
          Aylık hedef
          <GoalPicker
            goals={monthGoals.data ?? []}
            value={planGoalId}
            onChange={setPlanGoalId}
            taskTitle={normalizedTitle ?? "Hedef"}
          />
        </label>
      )}

      <ColorSlotPicker
        value={colorSlot}
        onChange={setColorSlot}
        legend="Hedef rengi"
      />

      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          variant="primary"
          disabled={normalizedTitle === null || targetInvalid}
          loading={pending}
        >
          {initial ? "Kaydet" : "Hedef ekle"}
        </Button>

        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Vazgeç
          </Button>
        )}
      </div>
    </form>
  );
}
