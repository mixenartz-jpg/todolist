"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { TextInput } from "@/components/Field";
import { SectionTitle } from "@/components/SectionTitle";
import { SkeletonList } from "@/components/Skeleton";
import { Toast, useToast } from "@/components/Toast";
import { useTasks } from "@/features/tasks/queries";
import { useViewer } from "@/lib/auth/ViewerProvider";
import { addDays, isDateStr, todayStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { formatShortDate } from "@/lib/ui/tr";
import { sortGaps, useGapItems, useGapToTask, useSetGapStatus, type GapItem } from "./queries";

const STATUS_TEXT: Record<GapItem["status"], string> = {
  open: "Açık",
  planned: "Planlandı",
  closed: "Kapandı",
};

/**
 * Eksik konu havuzu (koç). Öğrencinin sonuçlarda yazdığı konular
 * burada toplanır; "Göreve çevir" bir güne görev açar, görev bitince
 * konu kendiliğinden kapanır.
 */
export function GapPool() {
  const viewer = useViewer();
  const toast = useToast();
  const query = useGapItems(viewer.studentId !== null);
  const tasksQuery = useTasks();
  const toTask = useGapToTask((m) => toast.show(m));
  const setStatus = useSetGapStatus((m) => toast.show(m));
  const [showClosed, setShowClosed] = useState(false);

  const items = useMemo(() => sortGaps(query.data ?? []), [query.data]);
  const visible = items.filter((g) => showClosed || g.status !== "closed");
  const closedCount = items.length - items.filter((g) => g.status !== "closed").length;
  const taskById = useMemo(
    () => new Map((tasksQuery.data ?? []).map((t) => [t.id, t])),
    [tasksQuery.data],
  );

  if (viewer.studentId === null) return null;

  return (
    <Card as="section" aria-label="Eksik konu havuzu">
      <SectionTitle
        trailing={
          closedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowClosed((v) => !v)}
              className="text-[length:var(--text-sm)] text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
            >
              {showClosed ? "Kapananları gizle" : `Kapanan ${closedCount}`}
            </button>
          )
        }
      >
        Eksik konu havuzu
      </SectionTitle>

      {query.isPending ? (
        <SkeletonList count={3} height={44} className="mt-3" />
      ) : visible.length === 0 ? (
        <p className="mt-2 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
          Açık eksik konu yok. Öğrenci sonuç girerken &quot;eksik konular&quot;a yazdıkları burada toplanır.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col divide-y divide-[var(--color-line)]">
          {visible.map((g) => (
            <GapRow
              key={g.id}
              gap={g}
              taskDate={g.taskId ? taskById.get(g.taskId)?.dueDate ?? null : null}
              pending={toTask.isPending}
              onToTask={(date) => toTask.mutate({ gap: g, date })}
              onStatus={(status) => setStatus.mutate({ id: g.id, status })}
            />
          ))}
        </ul>
      )}

      <Toast message={toast.message} variant={toast.variant} token={toast.token} onDismiss={toast.dismiss} />
    </Card>
  );
}

function GapRow({
  gap,
  taskDate,
  pending,
  onToTask,
  onStatus,
}: {
  gap: GapItem;
  taskDate: DateStr | null;
  pending: boolean;
  onToTask: (date: DateStr) => void;
  onStatus: (s: GapItem["status"]) => void;
}) {
  const [picking, setPicking] = useState(false);
  const [date, setDate] = useState<string>(addDays(todayStr(), 1));

  return (
    <li className="py-2.5">
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-[length:var(--text-base)]">
          {gap.topic}
          {gap.count > 1 && (
            <span className="ml-1.5 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">×{gap.count}</span>
          )}
        </span>
        <span
          className="shrink-0 text-[length:var(--text-2xs)] font-medium"
          style={{
            color:
              gap.status === "open"
                ? "var(--color-warn)"
                : gap.status === "planned"
                  ? "var(--color-accent)"
                  : "var(--color-good)",
          }}
        >
          {STATUS_TEXT[gap.status]}
          {gap.status === "planned" && taskDate && ` · ${formatShortDate(taskDate)}`}
        </span>
      </div>
      <p className="text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
        {gap.subject ? `${gap.subject} · ` : ""}ilk {formatShortDate(gap.firstSeen)}
        {gap.lastSeen !== gap.firstSeen && ` · son ${formatShortDate(gap.lastSeen)}`}
      </p>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {gap.status === "open" && !picking && (
          <>
            <Button size="sm" variant="secondary" onClick={() => setPicking(true)}>
              Göreve çevir
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onStatus("closed")}>
              Kapat
            </Button>
          </>
        )}
        {gap.status === "open" && picking && (
          <>
            <div className="w-40">
              <TextInput
                type="date"
                size="sm"
                aria-label="Görev günü"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              loading={pending}
              disabled={!isDateStr(date)}
              onClick={() => {
                if (isDateStr(date)) onToTask(date);
                setPicking(false);
              }}
            >
              Oluştur
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPicking(false)}>
              Vazgeç
            </Button>
          </>
        )}
        {gap.status !== "open" && (
          <Button size="sm" variant="ghost" onClick={() => onStatus("open")}>
            Yeniden aç
          </Button>
        )}
      </div>
    </li>
  );
}
