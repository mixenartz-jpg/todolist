"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/Button";
import { TextInput } from "@/components/Field";
import { useMarkItems, useMarkRange, type SourceMarks } from "./markQueries";
import { parseRangeInput } from "./marks";
import type { SourceProgress } from "./progress";
import type { CatalogSelection } from "./selection";
import type { MarkStatus } from "./unitStatus";

/** Ardışık numaraları aralıklara topla: [1,2,3,7] → 1-3, 7-7. */
export function toSpans(numbers: Iterable<number>): Array<{ from: number; to: number }> {
  const sorted = [...numbers].sort((a, b) => a - b);
  const out: Array<{ from: number; to: number }> = [];
  for (const n of sorted) {
    const last = out[out.length - 1];
    if (last && last.to + 1 === n) last.to = n;
    else out.push({ from: n, to: n });
  }
  return out;
}

/**
 * Seçili birimlere elle işaret uygula. Test kaynağında item işaretleri,
 * diğer birimlerde bölümün aralık işaretleri.
 */
export function useApplyMarks(onError?: (m: string) => void) {
  const markItems = useMarkItems(onError);
  const markRange = useMarkRange(onError);

  function apply(
    progress: SourceProgress,
    sel: ReadonlyMap<string, ReadonlySet<number>>,
    marks: SourceMarks,
    status: MarkStatus | null,
    note: string | null,
  ) {
    for (const series of progress.series) {
      for (const sp of series.sections) {
        const numbers = sel.get(sp.section.id);
        if (!numbers || numbers.size === 0) continue;
        if (progress.source.unit === "test") {
          const itemIds = sp.section.items.filter((i) => numbers.has(i.number)).map((i) => i.id);
          if (itemIds.length) markItems.mutate({ itemIds, status, note });
        } else {
          markRange.mutate({
            sectionId: sp.section.id,
            spans: toSpans(numbers),
            status,
            note,
            current: marks.ranges.filter((r) => r.sectionId === sp.section.id),
          });
        }
      }
    }
  }

  return { apply, pending: markItems.isPending || markRange.isPending };
}

/**
 * Seçimden sonra ekranın altında açılan eylem çubuğu: "Ödevlendirildi",
 * "Çözüldü", "İşareti kaldır" (+ çağıranın verdiği "Güne ekle").
 */
export function MarkBar({
  selection,
  progress,
  marks,
  extra,
  onError,
}: {
  selection: CatalogSelection;
  progress: SourceProgress;
  marks: SourceMarks;
  /** Ek eylemler (ör. "Güne ekle"). */
  extra?: ReactNode;
  onError?: (m: string) => void;
}) {
  const { apply, pending } = useApplyMarks(onError);
  const [note, setNote] = useState("");
  if (selection.count === 0) return null;

  const run = (status: MarkStatus | null) => {
    apply(progress, selection.sel, marks, status, note.trim() || null);
    selection.clear();
    setNote("");
  };

  return (
    <div
      role="toolbar"
      aria-label="Seçili birimler"
      className="sticky bottom-[calc(var(--tabbar-h,0px)+0.75rem)] z-20 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-2 shadow-lg"
    >
      <span className="px-1 text-[length:var(--text-sm)] font-medium tabular-nums">{selection.count} seçili</span>
      {extra}
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run("assigned")}>
        Ödevlendirildi
      </Button>
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run("done")}>
        Çözüldü
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(null)}>
        İşareti kaldır
      </Button>
      <div className="min-w-[8rem] flex-1">
        <TextInput size="sm" aria-label="İşaret notu" placeholder="Not (opsiyonel)" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <Button size="sm" variant="ghost" onClick={selection.clear} aria-label="Seçimi temizle">
        ✕
      </Button>
    </div>
  );
}

/** Kutucuk menüsü (sağ tık / uzun basma): tek birim için üç eylem. */
export function UnitMenu({
  anchor,
  title,
  onAction,
  onClose,
}: {
  anchor: HTMLElement;
  title: string;
  onAction: (status: MarkStatus | null) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rect = anchor.getBoundingClientRect();

  useEffect(() => {
    const close = (e: Event) => {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onClose, true);
    ref.current?.querySelector("button")?.focus();
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  const item = "block w-full rounded-md px-3 py-1.5 text-left text-[length:var(--text-sm)] hover:bg-[var(--color-surface-2)]";
  return (
    <div
      ref={ref}
      role="menu"
      aria-label={title}
      className="fixed z-50 min-w-44 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] p-1 shadow-lg"
      style={{ top: Math.min(rect.bottom + 4, window.innerHeight - 140), left: Math.min(rect.left, window.innerWidth - 190) }}
    >
      <p className="px-3 py-1 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">{title}</p>
      <button type="button" role="menuitem" className={item} onClick={() => onAction("assigned")}>
        Ödevlendirildi işaretle
      </button>
      <button type="button" role="menuitem" className={item} onClick={() => onAction("done")}>
        Çözüldü işaretle
      </button>
      <button type="button" role="menuitem" className={item} onClick={() => onAction(null)}>
        İşareti kaldır
      </button>
    </div>
  );
}

/** Soru/sayfa/ders: aralık girişiyle işaret ("1-52 çözüldü"). */
export function RangeMarkInput({
  min,
  max,
  value,
  onChange,
  onApply,
  onSelect,
  unitLabel,
}: {
  min: number;
  max: number;
  value: string;
  onChange: (v: string) => void;
  onApply: (span: { from: number; to: number }, status: MarkStatus | null) => void;
  /** Aralığı seçime al (eylem çubuğundan "Güne ekle"). */
  onSelect?: (span: { from: number; to: number }) => void;
  unitLabel: string;
}) {
  const span = parseRangeInput(value, min, max);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <div className="w-28">
        <TextInput
          size="sm"
          aria-label={`İşaretlenecek ${unitLabel} aralığı`}
          placeholder={`${min}-${Math.min(max, min + 9)}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {onSelect && (
        <Button size="sm" variant="secondary" disabled={!span} onClick={() => span && onSelect(span)}>
          Seç
        </Button>
      )}
      <Button size="sm" variant="ghost" disabled={!span} onClick={() => span && onApply(span, "assigned")}>
        Ödevlendirildi
      </Button>
      <Button size="sm" variant="ghost" disabled={!span} onClick={() => span && onApply(span, "done")}>
        Çözüldü
      </Button>
      <Button size="sm" variant="ghost" disabled={!span} onClick={() => span && onApply(span, null)}>
        Kaldır
      </Button>
    </div>
  );
}
