import { Card } from "@/components/Card";
import { SectionTitle } from "@/components/SectionTitle";
import type { CoachNote } from "@/features/results/types";

/** Koçun o güne yazdığı not — öğrenci için salt okunur. */
export function CoachNotesCard({ notes }: { notes: readonly CoachNote[] }) {
  return (
    <Card as="section" aria-label="Koçtan notlar">
      <SectionTitle level={2}>Koçtan notlar</SectionTitle>
      {notes.length === 0 ? (
        <p className="mt-2 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
          Bu gün için not yok.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {notes.map((n) => (
            <li
              key={`${n.date}-${n.scale}`}
              className="whitespace-pre-wrap text-[length:var(--text-base)] leading-[var(--leading-relaxed)] text-[var(--color-ink)]"
            >
              {n.scale === "week" && (
                <span className="mr-1 text-[length:var(--text-2xs)] uppercase text-[var(--color-ink-3)]">
                  Hafta ·
                </span>
              )}
              {n.note}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
