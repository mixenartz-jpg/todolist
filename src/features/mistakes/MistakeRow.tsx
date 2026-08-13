"use client";

import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { formatShortDate } from "@/lib/ui/tr";
import { Chevron } from "@/components/Chevron";
import { MistakeImage } from "./MistakeImage";
import { GRADUATED_STAGE, isDue, toReviewState } from "./review";
import type { Mistake } from "./types";
import "@/components/list-motion.css";

interface MistakeRowProps {
  mistake: Mistake;
  today: DateStr;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReviewed: () => void;
  reviewPending: boolean;
}

/**
 * Ağacın üçüncü seviyesi: tek bir yanlış.
 *
 * Kapalıyken yalnızca tarih ve tekrar durumu görünür — ders/konu
 * bilgisi zaten üstteki iki seviyede yazılı, tekrarlamak satırı
 * şişirirdi. Açılınca ekran görüntüsü, not ve eylemler gelir.
 *
 * ── Eylemler neden hover'da değil? ──
 * Eski kart düzeninde düzenle/sil `revealOnHover` ile geliyordu; bu
 * dokunmatikte hiç çalışmayan bir etkileşimdi. Ağaçta detay zaten
 * açılıyor: eylemleri oraya koymak onları her girdide erişilebilir
 * kılar ve satırları sade bırakır.
 *
 * `memo` YOK: derleyici (babel-plugin-react-compiler) bunu zaten
 * üretiyor ve elle sarmalamak, projedeki hiçbir bileşende olmayan bir
 * istisna yaratmaktan başka işe yaramaz.
 */
export function MistakeRow({
  mistake,
  today,
  open,
  onToggle,
  onEdit,
  onDelete,
  onReviewed,
  reviewPending,
}: MistakeRowProps) {
  const label = `${formatShortDate(mistake.date)} · ${mistake.ders} · ${mistake.konu}`;
  const due = isDue(toReviewState(mistake), today);

  return (
    <li className="rowEnter">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md py-1.5 pl-12 pr-3 text-left",
          "transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-surface-2)]",
        )}
      >
        <Chevron open={open} />
        <span className="tabular text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          {formatShortDate(mistake.date)}
        </span>
        <ReviewBadge mistake={mistake} due={due} />
        {mistake.imagePath && <ImageDot />}
      </button>

      {open && (
        // Girinti satırdakinden bir kademe fazladır: detay, açıldığı
        // satırın metniyle hizalanır, chevron'unun altına düşmez.
        <div className="flex flex-col items-start gap-2.5 py-2 pl-[4.25rem] pr-3">
          {mistake.imagePath && (
            <MistakeImage
              path={mistake.imagePath}
              width={mistake.imageWidth}
              height={mistake.imageHeight}
              alt={`${label} ekran görüntüsü`}
            />
          )}

          {mistake.note ? (
            <p className="whitespace-pre-wrap text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">
              {mistake.note}
            </p>
          ) : (
            !mistake.imagePath && (
              <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                Bu yanlışa not ya da ekran görüntüsü eklenmemiş.
              </p>
            )
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            {due && (
              <ActionButton onClick={onReviewed} disabled={reviewPending} primary>
                Tekrar ettim
              </ActionButton>
            )}
            <ActionButton onClick={onEdit}>Düzenle</ActionButton>
            <ActionButton onClick={onDelete} danger>
              Sil
            </ActionButton>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * Tekrar durumu rozeti.
 *
 * Vadesi gelmiş olan önce gelir: kullanıcının o an yapabileceği tek şey
 * odur. Mezun olmuş yanlış "bitti" der; devam edenler kaçıncı tekrarda
 * olduklarını gösterir ki merdiven görünmez bir mekanizma olmasın.
 */
function ReviewBadge({ mistake, due }: { mistake: Mistake; due: boolean }) {
  if (due) {
    return (
      <span className="text-[length:var(--text-xs)] text-[var(--color-warn)]">
        · tekrarı geldi
      </span>
    );
  }
  if (mistake.reviewStage >= GRADUATED_STAGE) {
    return (
      <span className="text-[length:var(--text-xs)] text-[var(--color-good)]">
        · tekrarı bitti
      </span>
    );
  }
  if (mistake.reviewStage === 0) return null;
  return (
    <span className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
      · {mistake.reviewStage}. tekrar yapıldı
    </span>
  );
}

/**
 * Ekran görüntüsü olduğunu belli eden nokta.
 *
 * Kapalı satırda görselin varlığı başka türlü anlaşılmaz; hangi
 * yanlışta bakılacak bir şey olduğunu açmadan görmek gezinmeyi
 * hızlandırır.
 */
function ImageDot() {
  return (
    <span
      className="ml-auto size-1.5 shrink-0 rounded-full bg-[var(--color-ink-3)]"
      title="Ekran görüntüsü var"
    >
      <span className="sr-only">Ekran görüntüsü var</span>
    </span>
  );
}

function ActionButton({
  onClick,
  children,
  primary = false,
  danger = false,
  disabled = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-md border px-2.5 py-1 text-[length:var(--text-xs)]",
        "transition-[color,background-color,border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
        "not-disabled:active:scale-[0.97] disabled:opacity-50",
        primary
          ? "border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[color-mix(in_oklch,var(--color-accent)_14%,transparent)]"
          : danger
            ? "border-[var(--color-line-2)] text-[var(--color-ink-3)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
            : "border-[var(--color-line-2)] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]",
      )}
    >
      {children}
    </button>
  );
}
