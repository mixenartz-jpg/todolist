"use client";

import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Button } from "@/components/Button";
import { Field, SelectInput, TextInput } from "@/components/Field";
import { Toast, useToast } from "@/components/Toast";
import { isDateStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { formatShortDate } from "@/lib/ui/tr";
import { cn } from "@/lib/ui/cn";
import { defaultAction } from "./actions";
import { AddTasksForm } from "./AddTasksForm";
import { readAmount, readPref, writeAmount, writePref } from "./catalogStore";
import type { SectionProgress, SourceProgress } from "./progress";
import { useCatalogSelection } from "./selection";
import { newIds, useCreatePlannedTasks } from "./taskCreate";
import { planProgressTask, planTasks, type TaskPlan } from "./title";
import type { SourceTree, Topic } from "./types";
import { KindIcon, percent, SummaryBar } from "./ui";
import { RangeBar, TestGrid } from "./UnitGrid";
import { isFree, nextFreeRun, nextFreeUnits } from "./unitStatus";
import { useSourceProgress } from "./useSourceProgress";

/*
 * Planlama'nın "Katalog" yan paneli (Hafta ve Gün görünümü).
 *
 *   Yol 2 — gün seç → kaynak → seri/bölüm/kutucuk → ekle
 *   Masaüstü — kutucuğu güne sürükle-bırak
 *
 * Her günün altındaki "Kaynaktan ekle" paneli o gün seçili açar;
 * sıradaki boş birimler önceden seçili gelir (son eklenen miktar kadar).
 * Panel ve katalog sayfası aynı önbelleği okur: görev eklenince ya da
 * silinince kutucuk rengi her ikisinde anında değişir.
 */

interface DragPayload {
  source: SourceTree;
  picks: ReadonlyMap<string, ReadonlySet<number>>;
}

interface CatalogCtx {
  open: boolean;
  date: DateStr | null;
  openFor: (date: DateStr | null) => void;
  toggle: () => void;
  close: () => void;
  setDate: (d: DateStr | null) => void;
  /** Masaüstü sürükleme yükü (kutucuk → gün). */
  drag: React.MutableRefObject<DragPayload | null>;
  /** Güne bırakıldı: katalog sürüklemesiyse görev(ler) oluştur, true döner. */
  dropOn: (date: DateStr) => boolean;
  /** Bir katalog sürüklemesi sürüyor mu (gün satırları hedef olsun). */
  dragging: boolean;
  setDragging: (v: boolean) => void;
  notify: (m: string) => void;
}

const Ctx = createContext<CatalogCtx | null>(null);

const noopSubscribe = () => () => {};

/** Sağlayıcı yoksa null: "Kaynaktan ekle" düğmesi çizilmez. */
export function useCatalogPanel(): CatalogCtx | null {
  return useContext(Ctx);
}

/**
 * Planlama sayfasını sarar: panel durumu, sürükleme yükü, panelin
 * kendisi ve bildirimi. Sayfa düzeyinde ki ekranın bırakma işleyicisi
 * (`handlePlace`) bağlama ulaşabilsin.
 */
export function CatalogPanelProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const onMessage = toast.show;
  // Hatırlanan açık/kapalı durumu; sunucu çiziminde ve hidrasyonda
  // kapalı (depo yok), ilk istemci boyamasından sonra gerçek değer.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [stored, setOpen] = useState(() => readPref("acik") === "1");
  const open = hydrated && stored;
  const [date, setDate] = useState<DateStr | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<DragPayload | null>(null);
  const create = useCreatePlannedTasks(onMessage);
  const { topics } = useSourceProgress();
  const topicMap = useMemo(() => new Map(topics.map((t) => [t.id, t] as const)), [topics]);

  useEffect(() => {
    if (hydrated) writePref("acik", stored ? "1" : null);
  }, [hydrated, stored]);

  const value: CatalogCtx = {
    open,
    date,
    openFor: (d) => {
      setDate(d);
      setOpen(true);
    },
    toggle: () => setOpen(!open),
    close: () => setOpen(false),
    setDate,
    drag,
    dragging,
    setDragging,
    notify: onMessage,
    dropOn: (d) => {
      const payload = drag.current;
      drag.current = null;
      setDragging(false);
      if (!payload) return false;
      const plans = planTasks({
        source: payload.source,
        topics: topicMap,
        picks: payload.picks,
        action: defaultAction(payload.source.kind),
        dueDate: d,
      });
      if (plans.length > 0) {
        create.mutate(
          { plans, ids: newIds(plans.length) },
          { onSuccess: () => onMessage(`${formatShortDate(d)}: ${plans.length} görev eklendi`) },
        );
      }
      return true;
    },
  };

  return (
    <Ctx.Provider value={value}>
      <div className={cn("flex min-h-0 flex-1 flex-col", open && "md:pr-[26rem]")}>{children}</div>
      <CatalogPanel />
      <Toast message={toast.message} variant={toast.variant} token={toast.token} onDismiss={toast.dismiss} />
    </Ctx.Provider>
  );
}

/** Günün altındaki düğme: paneli o gün seçili açar. */
export function CatalogAddButton({ date, className }: { date: DateStr; className?: string }) {
  const ctx = useCatalogPanel();
  if (!ctx) return null;
  return (
    <button
      type="button"
      onClick={() => ctx.openFor(date)}
      className={cn(
        "shrink-0 rounded-md px-2 py-1 text-[length:var(--text-sm)] text-[var(--color-accent)] hover:bg-[var(--color-surface-2)]",
        className,
      )}
    >
      Kaynaktan ekle
    </button>
  );
}

/** Üst bardaki aç/kapa düğmesi. */
export function CatalogToggle() {
  const ctx = useCatalogPanel();
  if (!ctx) return null;
  return (
    <Button size="sm" variant={ctx.open ? "primary" : "secondary"} onClick={ctx.toggle} aria-pressed={ctx.open}>
      Katalog
    </Button>
  );
}

function CatalogPanel() {
  const ctx = useCatalogPanel();
  const onMessage = (m: string) => ctx?.notify(m);
  const { trees, topics, progress, loading } = useSourceProgress();
  const [subject, setSubject] = useState<string>(() => readPref("ders") ?? "");
  const [sourceId, setSourceId] = useState<string | null>(() => readPref("kaynak"));

  const subjects = useMemo(
    () => [...new Set(trees.map((t) => t.subject?.trim() || "Diğer"))].sort((a, b) => a.localeCompare(b, "tr")),
    [trees],
  );
  const list = trees.filter((t) => !subject || (t.subject?.trim() || "Diğer") === subject);
  const current = sourceId ? progress.get(sourceId) : undefined;

  if (!ctx?.open) return null;

  return (
    <aside
      aria-label="Katalog"
      className="fixed inset-x-0 bottom-0 top-auto z-40 flex max-h-[85dvh] flex-col border-t border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:top-0 md:max-h-none md:w-[26rem] md:border-t-0 md:border-l"
    >
      <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-3">
        <h2 className="flex-1 text-[length:var(--text-lg)] font-semibold">Katalog</h2>
        <div className="w-40">
          <TextInput
            size="sm"
            type="date"
            aria-label="Eklenecek gün"
            value={ctx.date ?? ""}
            onChange={(e) => ctx.setDate(isDateStr(e.target.value) ? e.target.value : null)}
          />
        </div>
        <Button size="sm" variant="ghost" onClick={ctx.close} aria-label="Kataloğu kapat">
          ✕
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {current ? (
          <SourcePane
            key={current.source.id}
            p={current}
            topics={topics}
            date={ctx.date}
            onBack={() => {
              setSourceId(null);
              writePref("kaynak", null);
            }}
            onMessage={onMessage}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <SelectInput
              size="sm"
              aria-label="Ders"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                writePref("ders", e.target.value || null);
              }}
            >
              <option value="">Tüm dersler</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SelectInput>
            {loading ? (
              <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">Yükleniyor…</p>
            ) : list.length === 0 ? (
              <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                Kaynak yok.{" "}
                <Link href="/koc/planlama/kaynaklar" className="text-[var(--color-accent)] hover:underline">
                  Kaynak ekle →
                </Link>
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {list.map((t) => {
                  const pr = progress.get(t.id);
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSourceId(t.id);
                          writePref("kaynak", t.id);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg border border-[var(--color-line)] p-2 text-left hover:border-[var(--color-line-3)]"
                      >
                        <span className="text-[var(--color-ink-2)]">
                          <KindIcon kind={t.kind} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[length:var(--text-sm)] font-medium">{t.title}</span>
                          {pr && <SummaryBar summary={pr.summary} className="mt-1" />}
                        </span>
                        <span className="shrink-0 text-[length:var(--text-sm)] tabular-nums">
                          %{pr ? percent(pr.summary) : 0}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

/** Önceden seçilecek bölüm: hatırlanan (boş birimi varsa), yoksa ilk boş bölüm. */
function initialSection(p: SourceProgress): SectionProgress | null {
  const all = p.series.flatMap((s) => s.sections);
  const remembered = readPref(`bolum.${p.source.id}`);
  const hit = all.find((s) => s.section.id === remembered && s.states.some(isFree));
  return hit ?? all.find((s) => s.states.some(isFree)) ?? all[0] ?? null;
}

function SourcePane({
  p,
  topics,
  date,
  onBack,
  onMessage,
}: {
  p: SourceProgress;
  topics: readonly Topic[];
  date: DateStr | null;
  onBack: () => void;
  onMessage: (m: string) => void;
}) {
  const ctx = useCatalogPanel();
  const isTest = p.source.unit === "test";
  const topicMap = useMemo(() => new Map(topics.map((t) => [t.id, t] as const)), [topics]);
  const selection = useCatalogSelection();
  const [sectionId, setSectionId] = useState<string | null>(() => initialSection(p)?.section.id ?? null);
  const section = p.series.flatMap((s) => s.sections).find((s) => s.section.id === sectionId) ?? null;

  // Test: sıradaki boş birimler önceden seçili (son eklenen miktar kadar).
  const preselected = useRef<string | null>(null);
  useEffect(() => {
    if (!isTest || !section || preselected.current === `${section.section.id}|${date}`) return;
    preselected.current = `${section.section.id}|${date}`;
    selection.selectOnly(section.section.id, nextFreeUnits(section.states, readAmount("test")));
    // Yalnızca bölüm ya da gün değişince; seçim elle değişebilmeli.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTest, section?.section.id, date]);

  // Aralık birimi: başlangıç = sıradaki boş, miktar = son eklenen.
  const firstFree = section ? nextFreeRun(section.states, 1)?.from : undefined;
  const [mode, setMode] = useState<"exact" | "progress">("exact");
  const [start, setStart] = useState<string>("");
  const [amount, setAmount] = useState<string>(() => String(readAmount("range")));
  const startNum = start.trim() === "" ? (firstFree ?? NaN) : Number(start);
  const amountNum = Number(amount);
  const endNum =
    section && Number.isFinite(startNum) && amountNum >= 1
      ? Math.min(section.section.unitTo, startNum + amountNum - 1)
      : NaN;

  function chooseSection(id: string) {
    setSectionId(id);
    setStart("");
    writePref(`bolum.${p.source.id}`, id);
  }

  function build(action: string, dueDate: DateStr | null): TaskPlan[] {
    if (isTest) return planTasks({ source: p.source, topics: topicMap, picks: selection.sel, action, dueDate });
    if (!section || !Number.isFinite(startNum) || !Number.isFinite(endNum) || endNum < startNum) return [];
    if (mode === "progress") {
      const plan = planProgressTask({ source: p.source, sectionId: section.section.id, start: startNum, target: amountNum, dueDate });
      return plan ? [plan] : [];
    }
    const numbers = new Set<number>();
    for (let n = startNum; n <= endNum; n++) numbers.add(n);
    return planTasks({ source: p.source, topics: topicMap, picks: new Map([[section.section.id, numbers]]), action, dueDate });
  }

  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={onBack} className="self-start text-[length:var(--text-sm)] text-[var(--color-ink-3)] hover:text-[var(--color-ink)]">
        ← Kaynaklar
      </button>
      <div className="flex items-center gap-2">
        <KindIcon kind={p.source.kind} />
        <Link href={`/koc/planlama/kaynaklar/${p.source.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
          {p.source.title}
        </Link>
        <span className="text-[length:var(--text-sm)] tabular-nums">%{percent(p.summary)}</span>
      </div>

      {p.series.map((sp) => (
        <div key={sp.series.id} className="flex flex-col gap-2">
          {p.series.length > 1 && (
            <p className="text-[length:var(--text-2xs)] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-3)]">
              {sp.series.name}
            </p>
          )}
          {sp.sections.map((sec) => (
            <div key={sec.section.id} className={cn("rounded-lg p-2", sec.section.id === sectionId && "bg-[var(--color-surface-2)]")}>
              <button
                type="button"
                onClick={() => chooseSection(sec.section.id)}
                className="flex w-full items-baseline gap-2 text-left"
                aria-pressed={sec.section.id === sectionId}
              >
                <span className="min-w-0 flex-1 truncate text-[length:var(--text-sm)]">{sec.section.label}</span>
                <span className="text-[length:var(--text-2xs)] tabular-nums text-[var(--color-ink-3)]">
                  {sec.summary.green}/{sec.summary.total}
                </span>
              </button>
              {isTest ? (
                <div
                  className="mt-1.5"
                  onDragStart={(e) => {
                    const target = e.target as HTMLElement;
                    const n = Number(target.dataset.unit);
                    if (!ctx || !Number.isFinite(n)) return;
                    const sel = selection.sel.get(sec.section.id);
                    const picks = sel?.has(n) ? selection.sel : new Map([[sec.section.id, new Set([n])]]);
                    ctx.drag.current = { source: p.source, picks };
                    ctx.setDragging(true);
                    e.dataTransfer.effectAllowed = "copy";
                    e.dataTransfer.setData("text/plain", `${p.source.title} ${n}`);
                  }}
                  onDragEnd={() => {
                    // `drop` her zaman `dragend`'den önce gelir; gün dışına
                    // bırakılan yük sonraki görev sürüklemesini kaçırmasın.
                    if (ctx) ctx.drag.current = null;
                    ctx?.setDragging(false);
                  }}
                >
                  <DraggableTestGrid
                    sec={sec}
                    selected={selection.sel.get(sec.section.id)}
                    onPick={(n, shift) => {
                      if (sec.section.id !== sectionId) setSectionId(sec.section.id);
                      selection.pick(sec.section.id, n, shift);
                    }}
                  />
                </div>
              ) : (
                <div className="mt-1.5">
                  <RangeBar states={sec.states} unitLabel={p.source.unit} />
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {!isTest && section && (
        <div className="flex flex-col gap-2 rounded-lg border border-[var(--color-line)] p-2">
          <div role="radiogroup" aria-label="Kip" className="flex gap-1.5">
            {(
              [
                ["exact", "Kesin aralık"],
                ["progress", "İlerlet"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "h-8 rounded-full border px-3 text-[length:var(--text-sm)]",
                  mode === m ? "border-[var(--color-accent)] text-[var(--color-ink)]" : "border-[var(--color-line-2)] text-[var(--color-ink-2)]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Başlangıç">
              {(fp) => (
                <TextInput
                  {...fp}
                  size="sm"
                  inputMode="numeric"
                  placeholder={firstFree !== undefined ? String(firstFree) : "—"}
                  value={start}
                  onChange={(e) => setStart(e.target.value.replace(/\D/g, ""))}
                />
              )}
            </Field>
            <Field label={mode === "progress" ? `Hedef (~${p.source.unit})` : "Miktar"}>
              {(fp) => (
                <TextInput
                  {...fp}
                  size="sm"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                />
              )}
            </Field>
            <Field label="Bitiş">
              {(fp) => <TextInput {...fp} size="sm" readOnly value={Number.isFinite(endNum) ? String(endNum) : "—"} />}
            </Field>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-[var(--color-line)] p-2">
        <AddTasksForm
          key={`${mode}-${date}`}
          kind={p.source.kind}
          compact
          defaultDate={date}
          fixedAction={!isTest && mode === "progress" ? "İlerlet" : undefined}
          build={build}
          onError={onMessage}
          onCreated={(plans) => {
            const units = plans.reduce((n, x) => n + x.units, 0);
            writeAmount(isTest ? "test" : "range", isTest ? units : amountNum);
            onMessage(`${plans.length} görev eklendi`);
            selection.clear();
            preselected.current = null;
            setStart("");
          }}
        />
      </div>
    </div>
  );
}

/** Masaüstünde sürüklenebilir test kutucukları (yalnızca boş birimler; seçim de çalışır). */
function DraggableTestGrid({
  sec,
  selected,
  onPick,
}: {
  sec: SectionProgress;
  selected: ReadonlySet<number> | undefined;
  onPick: (n: number, shift: boolean) => void;
}) {
  return <TestGrid states={sec.states} selected={selected} onPick={onPick} draggableFree />;
}
