"use client";

import { useState } from "react";
import { ENERGY_LABELS, SCREEN_BUCKETS, STUDY_BUCKETS } from "@/features/results/buckets";
import { formatMinutesShort, isLogFilled, sleepMinutes } from "@/features/results/format";
import { CoachNoteEditor } from "@/features/day/CoachNoteEditor";
import type { DailyLog } from "@/features/results/types";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { useStudentData } from "./StudentDataProvider";

type Panel = "log" | "note" | null;

/**
 * Gün başlığındaki öğrenci şeridi: günlük form dolduysa bir ikon
 * (tıklayınca özet) ve "Koç notu" (öğrenciye görünür, düzenlenebilir).
 */
export function DayStudentBar({ date }: { date: DateStr }) {
  const data = useStudentData();
  const [panel, setPanel] = useState<Panel>(null);
  if (!data || !data.studentId) return null;

  const log = data.logByDate.get(date);
  const note = data.noteByDate.get(date);
  const filled = isLogFilled(log);

  const toggle = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1 text-[length:var(--text-2xs)]">
        {filled && (
          <ChipButton active={panel === "log"} onClick={() => toggle("log")} label="Öğrencinin günlük formu">
            Form ✓
          </ChipButton>
        )}
        <ChipButton
          active={panel === "note"}
          onClick={() => toggle("note")}
          label={note ? "Koç notunu düzenle" : "Koç notu ekle"}
          highlight={Boolean(note)}
        >
          <span aria-hidden>✎</span> {note ? "Koç notu" : "Not ekle"}
        </ChipButton>
      </div>

      {panel === "log" && log && <LogSummary log={log} />}
      {panel === "note" && (
        <CoachNoteEditor
          key={note?.updatedAt ?? "new"}
          date={date}
          studentId={data.studentId}
          initial={note?.note ?? ""}
          onDone={() => setPanel(null)}
        />
      )}
    </div>
  );
}

function ChipButton({
  active,
  highlight,
  onClick,
  label,
  children,
}: {
  active: boolean;
  highlight?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full border px-2 transition-colors",
        active || highlight
          ? "border-[color-mix(in_oklch,var(--color-accent)_45%,transparent)] text-[var(--color-accent)]"
          : "border-[var(--color-line)] text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]",
      )}
    >
      {children}
    </button>
  );
}

function LogSummary({ log }: { log: DailyLog }) {
  const sleep = sleepMinutes(log);
  const rows: Array<[string, string]> = [];
  if (log.sleepAt || log.wakeAt) {
    rows.push([
      "Uyku",
      `${log.sleepAt ?? "?"} → ${log.wakeAt ?? "?"}${sleep !== null ? ` (${formatMinutesShort(sleep)})` : ""}`,
    ]);
  }
  if (log.studyBucket !== null) rows.push(["Çalışma", STUDY_BUCKETS[log.studyBucket] ?? "—"]);
  if (log.screenBucket !== null) rows.push(["Ekran", SCREEN_BUCKETS[log.screenBucket] ?? "—"]);
  if (log.energy !== null) rows.push(["Enerji", `${log.energy}/5 · ${ENERGY_LABELS[log.energy]}`]);

  return (
    <div className="rounded-md bg-[var(--color-surface-2)] p-2 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-[var(--color-ink-3)]">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {log.note && <p className="mt-1.5 whitespace-pre-wrap">{log.note}</p>}
    </div>
  );
}
