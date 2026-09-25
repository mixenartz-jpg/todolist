"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Chevron } from "@/components/Chevron";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { DateStr } from "@/lib/date/types";
import { formatEstimate } from "@/features/tasks/estimate";
import type { Task } from "@/features/tasks/types";
import { cn } from "@/lib/ui/cn";
import { slotVar } from "@/lib/ui/colors";
import { formatPercent, formatRelativeDay } from "@/lib/ui/tr";
import { GoalNodeForm } from "./GoalNodeForm";
import { NodeSendToDay } from "./NodeSendToDay";
import type { NodeProgress } from "./nodeprogress";
import { GOAL_NODE_MAX_DEPTH, type FlatGoalNode } from "./tree";

interface GoalNodeRowProps {
  flat: FlatGoalNode;
  progress: NodeProgress | undefined;
  /** Hedefin rengi — düğümün kendi rengi yok, ağacın tamamı hedefin. */
  colorSlot: number;
  collapsed: boolean;
  focused: boolean;
  selected: boolean;
  today: DateStr;
  pending: boolean;
  /** Bu düğüm ve altındaki kaç başlık silinecek — onay metni için. */
  subtreeCount: number;
  /** Bu düğümün taşınabileceği yerler; boşsa "Taşı" gösterilmez. */
  moveTargets: readonly { id: string | null; label: string }[];
  onToggleCollapse: () => void;
  onFocus: () => void;
  onToggleSelect: () => void;
  onRename: (values: { title: string; note: string | null }) => void;
  onAddChild: () => void;
  onDelete: () => void;
  onMove: (parentId: string | null) => void;
  /** Bir ya da BİRDEN ÇOK güne gönder — her güne bir görev. */
  onSend: (dates: readonly DateStr[], estimateMinutes: number | null) => void;
  /** Tekrarlanan kalem bayrağını çevir (0024). */
  onToggleRepeating: () => void;
  /**
   * Bu kalemin KENDİ görevleri — "nereye gönderildi" çipleri
   * (bkz. `sentTasksByNode`). Çocukların görevleri burada YOK.
   */
  sentTasks: readonly Task[];
  /** Gönderilmiş (bitmemiş) bir görevi geri al — görevi siler. */
  onRecall: (taskId: string) => void;
  onReorder: (delta: -1 | 1) => void;
  /** Sürükleme başlatıcısı (Faz 6); verilmezse satır sürüklenemez. */
  onDragStart?: () => void;
  /**
   * Satırın ALTINA çizilecek içerik — "yeni alt başlık" formu.
   *
   * Ayrı bir `<li>` DEĞİL ve olamaz: `role="tree"` altındaki her
   * çocuk `treeitem` olmalı; araya bir form satırı koymak ağacın
   * yapısını ekran okuyucuya bozuk gösterirdi.
   */
  children?: React.ReactNode;
}

/**
 * Ağaçtaki tek satır — `role="treeitem"`.
 *
 * ── Neden iç içe <ul> değil, düz liste? ──
 * ARIA ağaç deseni ikisine de izin veriyor. Düz olanı seçildi çünkü
 * derinlik en fazla 3 ve iç içe yapı, düzleştirme/klavye mantığını
 * JSX'e taşırdı — orası bu depoda test EDİLEMEZ (vitest yalnızca
 * `.ts` çalıştırıyor). `flattenGoalTree` zaten tam çizim sırasını
 * veriyor; bu bileşen onu dökmekten başka bir şey yapmıyor.
 *
 * Hiyerarşi iki kanaldan anlatılıyor: girinti ve sol kılavuz çizgisi.
 * Yalnızca boşlukla anlatmak, 2. ve 3. seviyeyi dar ekranda
 * ayırt edilemez kılardı.
 */
export function GoalNodeRow({
  flat,
  progress,
  colorSlot,
  collapsed,
  focused,
  selected,
  today,
  pending,
  subtreeCount,
  moveTargets,
  onToggleCollapse,
  onFocus,
  onToggleSelect,
  onRename,
  onAddChild,
  onDelete,
  onMove,
  onSend,
  onToggleRepeating,
  sentTasks,
  onRecall,
  onReorder,
  onDragStart,
  children,
}: GoalNodeRowProps) {
  const [editing, setEditing] = useState(false);
  const [sending, setSending] = useState(false);
  const [moving, setMoving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { node, level, hasChildren, index, siblingCount } = flat;
  const canHaveChildren = level < GOAL_NODE_MAX_DEPTH;

  const ratio = progress?.ratio ?? null;
  const measured = ratio !== null;

  return (
    <li
      role="treeitem"
      aria-level={level}
      aria-setsize={siblingCount}
      aria-posinset={index + 1}
      // Yaprakta HİÇ yazılmaz: `aria-expanded="false"` ekran
      // okuyucuya "gizlenmiş içerik var" derdi ve yaprakta yok.
      aria-expanded={hasChildren ? !collapsed : undefined}
      aria-selected={selected}
      // Gezinen tabIndex: ağacın tamamı TEK sekme durağı. Otuz satırlık
      // bir ağaçta her satırın durak olması, Tab ile sayfayı geçmeyi
      // imkânsız kılardı.
      tabIndex={focused ? 0 : -1}
      onFocus={onFocus}
      data-node-id={node.id}
      draggable={onDragStart !== undefined}
      onDragStart={onDragStart}
      style={{ paddingLeft: `calc(${level - 1} * 1.25rem)` }}
      className={cn(
        "relative rounded-lg outline-none",
        focused && "ring-1 ring-[var(--color-focus)]",
      )}
    >
      {/* Seviye kılavuzu: hiyerarşi yalnızca boşlukla anlatılmaz. */}
      {level > 1 && (
        <span
          aria-hidden
          className="absolute bottom-0 top-0 w-px bg-[var(--color-line)]"
          style={{ left: `calc(${level - 2} * 1.25rem + 0.4rem)` }}
        />
      )}

      <div
        className={cn(
          "flex items-start gap-1.5 rounded-lg px-1.5 py-1.5",
          "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quart)]",
          selected
            ? "bg-[var(--color-accent-soft)]"
            : "hover:bg-[var(--color-surface-2)]",
        )}
      >
        {/* Katlama. Yaprakta yer tutar ama buton değil: satırlar
            hizasını kaybetmesin. */}
        {hasChildren ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={`${node.title}: ${collapsed ? "aç" : "kapat"}`}
            className="mt-1 shrink-0 rounded p-0.5 hover:bg-[var(--color-surface-3)]"
          >
            <Chevron open={!collapsed} />
          </button>
        ) : (
          <span aria-hidden className="mt-1 size-[18px] shrink-0" />
        )}

        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label={`${node.title}: toplu dağıtım için seç`}
          className="mt-1.5 shrink-0 accent-[var(--color-accent)]"
        />

        <div className="min-w-0 flex-1">
          {editing ? (
            <GoalNodeForm
              initial={node}
              pending={pending}
              onSubmit={(values) => {
                onRename(values);
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label={`${node.title}: düzenle`}
                className={cn(
                  "text-left text-[length:var(--text-sm)] hover:text-[var(--color-accent)]",
                  level === 1 ? "font-medium" : "font-normal",
                )}
              >
                {node.title}
              </button>

              {node.repeating && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full border border-[var(--color-line-2)] px-1.5 align-middle text-[length:var(--text-2xs)] text-[var(--color-accent)]">
                  <span aria-hidden>↻</span> Tekrarlı
                </span>
              )}

              {node.note && (
                <p className="mt-0.5 text-[length:var(--text-xs)] leading-relaxed text-[var(--color-ink-3)]">
                  {node.note}
                </p>
              )}

              <NodeProgressLine
                progress={progress}
                title={node.title}
                colorSlot={colorSlot}
                measured={measured}
                ratio={ratio}
              />

              <SentTasks
                tasks={sentTasks}
                title={node.title}
                today={today}
                onRecall={onRecall}
              />
            </>
          )}
        </div>

        {!editing && (
          <div className="flex shrink-0 items-center gap-0.5">
            <RowButton
              label={`${node.title}: yukarı taşı`}
              onClick={() => onReorder(-1)}
            >
              ↑
            </RowButton>
            <RowButton
              label={`${node.title}: aşağı taşı`}
              onClick={() => onReorder(1)}
            >
              ↓
            </RowButton>

            {/* Tekrarlanan kalem: güne gönderilince tükenmez. */}
            <RowButton
              label={
                node.repeating
                  ? `${node.title}: tekrarlanan kalem, kapat`
                  : `${node.title}: tekrarlanan kalem yap`
              }
              pressed={node.repeating}
              onClick={onToggleRepeating}
            >
              ↻
            </RowButton>

            {/* 3. seviyede alt başlık YOK: sınır burada görünür
                olmalı, basıldıktan sonra hata vermemeli. */}
            {canHaveChildren && (
              <RowButton
                label={`${node.title}: alt başlık ekle`}
                onClick={onAddChild}
              >
                +
              </RowButton>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSending((open) => !open)}
              aria-expanded={sending}
            >
              Güne
            </Button>

            {moveTargets.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setMoving((open) => !open)}
                aria-expanded={moving}
              >
                Taşı
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              aria-label={`${node.title}: sil`}
            >
              Sil
            </Button>
          </div>
        )}
      </div>

      {sending && (
        <NodeSendToDay
          today={today}
          pending={pending}
          onSend={(dates, estimateMinutes) => {
            onSend(dates, estimateMinutes);
            setSending(false);
          }}
          onCancel={() => setSending(false)}
        />
      )}

      {moving && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] p-2.5">
          <label className="text-[length:var(--text-xs)] text-[var(--color-ink-2)]">
            <span className="sr-only">{node.title}: nereye taşınsın</span>
            Şunun altına:
          </label>
          <select
            defaultValue=""
            onChange={(event) => {
              const value = event.target.value;
              if (value === "") return;
              onMove(value === "__root__" ? null : value);
              setMoving(false);
            }}
            className="min-w-0 flex-1 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-[length:var(--text-xs)]"
          >
            <option value="">Seç…</option>
            {moveTargets.map((target) => (
              <option key={target.id ?? "__root__"} value={target.id ?? "__root__"}>
                {target.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`"${node.title}" silinsin mi?`}
          description={
            subtreeCount > 1
              ? `Bu başlık ve altındaki ${subtreeCount - 1} başlık silinir. Bu başlıklardan üretilmiş görevler SİLİNMEZ, yalnızca bağsız kalır.`
              : "Bu başlıktan üretilmiş görevler SİLİNMEZ, yalnızca bağsız kalır."
          }
          confirmLabel="Sil"
          onConfirm={() => {
            onDelete();
            setConfirmDelete(false);
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {children}
    </li>
  );
}

/**
 * Düğümün ilerleme satırı.
 *
 * `GoalCard` ile aynı üç durumlu dil: ölçülüyorsa çubuk + yüzde,
 * ölçülmüyorsa çubuk YOK ve bir cümle. %0 çizmek "hiç başlamadın"
 * derdi; doğrusu "henüz dağıtılmadı" (nodeprogress.ts'in `ratio: null`
 * gerekçesi).
 */
function NodeProgressLine({
  progress,
  title,
  colorSlot,
  measured,
  ratio,
}: {
  progress: NodeProgress | undefined;
  title: string;
  colorSlot: number;
  measured: boolean;
  ratio: number | null;
}) {
  if (!measured) {
    return (
      <p className="mt-1 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
        {progress?.leaf === false
          ? "Altındaki kalemler henüz güne dağıtılmadı."
          : "Henüz güne dağıtılmadı."}
      </p>
    );
  }

  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div
        className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((ratio ?? 0) * 100)}
        aria-label={`${title} ilerlemesi`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out-expo)]"
          style={{
            width: `${(ratio ?? 0) * 100}%`,
            background: slotVar(colorSlot),
          }}
        />
      </div>

      <span className="tabular shrink-0 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
        {progress?.taskDone} / {progress?.taskTotal} iş ·{" "}
        {formatPercent(ratio ?? 0)}
      </span>
    </div>
  );
}

/**
 * "Nereye gönderildi" çipleri: her görev için gün, varsa süre.
 *
 * Bitmemiş görevin çipinde × vardır ve görevi o günden GERİ ALIR
 * (görev silinir, kalem "henüz dağıtılmadı"ya döner). Bitmiş görevde
 * yok: tamamlanmış iş bir kayıttır ve arşivden, günlük toplamlardan
 * sessizce silinmemeli.
 */
function SentTasks({
  tasks,
  title,
  today,
  onRecall,
}: {
  tasks: readonly Task[];
  title: string;
  today: DateStr;
  onRecall: (taskId: string) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      <span className="text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
        Gönderildi:
      </span>
      {tasks.map((task) => {
        const day = formatRelativeDay(task.dueDate, today);
        const text =
          task.estimateMinutes === null
            ? day
            : `${day} · ${formatEstimate(task.estimateMinutes)}`;

        return (
          <span
            key={task.id}
            className={cn(
              "tabular inline-flex items-center gap-1 rounded-full border py-0.5 pl-2 text-[length:var(--text-2xs)]",
              task.done
                ? "border-transparent bg-[var(--color-surface-3)] pr-2 text-[var(--color-ink-3)]"
                : "border-[var(--color-line-2)] bg-[var(--color-surface)] pr-0.5 text-[var(--color-ink-2)]",
            )}
          >
            {task.done && <span aria-hidden>✓</span>}
            <span>
              {task.done && <span className="sr-only">Tamamlandı: </span>}
              {text}
            </span>
            {!task.done && (
              <button
                type="button"
                onClick={() => onRecall(task.id)}
                aria-label={`${title}: ${day} gününden geri al`}
                title="Geri al"
                className="grid size-4 place-items-center rounded-full text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-danger)]"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
                  <path
                    d="M1.5 1.5l5 5M6.5 1.5l-5 5"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}

function RowButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  /** Aç/kapa düğmesi ise basılı durumu. */
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
      className={cn(
        "size-6 rounded text-[length:var(--text-xs)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-ink)]",
        pressed
          ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
          : "text-[var(--color-ink-3)]",
      )}
    >
      {children}
    </button>
  );
}
