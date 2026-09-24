"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Chevron } from "@/components/Chevron";
import { cn } from "@/lib/ui/cn";
import type { Task } from "@/features/tasks/types";
import { goalTreeProgress } from "./nodeprogress";
import { useGoalNodes } from "./nodeQueries";
import { buildGoalTree, flattenGoalTree } from "./tree";
import type { PlanGoal } from "./types";
import "./planlama.css";

interface PlanNodePanelProps {
  /** Ayın hedefleri — panel bunlardan birini seçtiriyor. */
  goals: readonly PlanGoal[];
  tasks: readonly Task[];
  /** Şu an yerleştirilmeyi bekleyen düğüm; null → kip kapalı. */
  selectedNodeId: string | null;
  onSelect: (nodeId: string | null) => void;
  /**
   * Seçili hedefi dışarı bildirir.
   *
   * Plan ekranı, yerleştirilen düğümün BAŞLIĞINA ihtiyaç duyuyor
   * (görev ondan doğuyor) ve onu bulmak için hangi ağacın açık
   * olduğunu bilmeli. Panel kendi sorgusunu zaten `useGoalNodes` ile
   * açıyor; ekran aynı anahtarı kullanınca ikinci bir ağ turu olmuyor.
   */
  onSelectGoal: (goalId: string | null) => void;
  /** Sürükleme başlatıcısı (Faz 6). */
  onDragStart?: (nodeId: string) => void;
}

/**
 * Plan ekranındaki hedef ağacı paneli.
 *
 * Ağaç sayfası planı KURMAK için; bu panel onu takvime DÖKMEK için.
 * Kullanıcı haftasına bakarken "şu konuyu şu güne koyayım" diyor ve
 * bunun için ayrı bir sayfaya gidip geri dönmesi gerekmemeli.
 *
 * ── Etkileşim: tıkla-yerleştir, sürükleme DEĞİL ──
 * `PlanBacklog`'un kurduğu kipin aynısı: bir satır seç (`aria-pressed`
 * ile duyurulur), sonra bir güne bas. Dokunmada, klavyede ve farede
 * aynı şekilde çalışır.
 *
 * Sürükle-bırak Faz 6'da bunun ÜSTÜNE geliyor ve İKİNCİL yoldur:
 * kaldırılsa hiçbir akış kaybolmaz. Sonradan okuyan biri onu "tek
 * yol"a yükseltmemeli — HTML5 yerel sürükleme dokunmada çalışmıyor ve
 * tek yol olsaydı özellik telefonda kullanılamaz olurdu.
 *
 * ── Neden yalnızca yapraklar seçilebilir DEĞİL? ──
 * Ara düğüm de güne gönderilebiliyor ("Asitler-Bazlar"ı tek seferde
 * bir güne yazmak). `nodeprogress.ts` ara düğümün kendi görevlerini
 * zaten sayıyor; burada kısıtlamak, orada desteklenen bir şeyi
 * arayüzde yasaklamak olurdu.
 */
export function PlanNodePanel({
  goals,
  tasks,
  selectedNodeId,
  onSelect,
  onSelectGoal,
  onDragStart,
}: PlanNodePanelProps) {
  const [open, setOpen] = useState(false);
  const [goalId, setGoalId] = useState<string | null>(null);

  // Arşivlenmiş hedefler seçim listesinde YOK — `activeCategories`'in
  // gerekçesiyle aynı: artık takip edilmeyen bir hedefe yeni iş
  // dağıtmak istenmez.
  const pickable = useMemo(
    () => goals.filter((g) => g.archivedAt === null),
    [goals],
  );

  // Hedef seçilmemişse ilkine düş: panel açıldığında boş bir seçici
  // göstermek, kullanıcıyı gereksiz bir adıma zorlardı.
  const effectiveGoalId = goalId ?? pickable[0]?.id ?? null;
  const goal = pickable.find((g) => g.id === effectiveGoalId);

  // Açık ağacı ekrana bildir. Panel kapalıyken null: kapalı bir
  // panelin hedefi yerleştirme kipini yanıltmamalı.
  useEffect(() => {
    onSelectGoal(open ? effectiveGoalId : null);
  }, [open, effectiveGoalId, onSelectGoal]);

  const nodesQuery = useGoalNodes(open ? effectiveGoalId : null);
  const nodes = useMemo(() => nodesQuery.data ?? [], [nodesQuery.data]);

  const progress = useMemo(
    () => goalTreeProgress(nodes, tasks),
    [nodes, tasks],
  );

  // Panelde katlama YOK: ağacın tamamı görünür olmalı ki kullanıcı
  // dağıtacağını arayabilsin. Düzenleme ağaç sayfasının işi.
  const flat = useMemo(
    () => flattenGoalTree(buildGoalTree(nodes), new Set()),
    [nodes],
  );

  return (
    <section className="planBacklog">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="mb-2 flex w-full items-center gap-1.5 text-left text-[length:var(--text-sm)] font-medium"
      >
        <Chevron open={open} />
        Hedef ağacı
      </button>

      {open && (
        <>
          {pickable.length === 0 ? (
            <p className="text-[length:var(--text-xs)] leading-relaxed text-[var(--color-ink-3)]">
              Bu ayın hedefi yok. Önce bir hedef yaz, sonra onu
              parçalara ayır.
            </p>
          ) : (
            <>
              <label className="mb-2 block">
                <span className="sr-only">Hangi hedefin ağacı</span>
                <select
                  value={effectiveGoalId ?? ""}
                  onChange={(event) => {
                    setGoalId(event.target.value);
                    // Hedef değişince eski ağaçtaki seçim anlamsız.
                    onSelect(null);
                  }}
                  className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-[length:var(--text-xs)]"
                >
                  {pickable.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </label>

              {nodesQuery.isPending ? (
                <div className="flex flex-col gap-1" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-6 animate-pulse rounded bg-[var(--color-surface-2)]"
                      style={{ animationDelay: `${i * 60}ms` }}
                    />
                  ))}
                </div>
              ) : flat.length === 0 ? (
                <p className="text-[length:var(--text-xs)] leading-relaxed text-[var(--color-ink-3)]">
                  Bu hedef henüz parçalara ayrılmadı.{" "}
                  {goal && (
                    <Link
                      href={`/planlama/hedefler/${goal.id}`}
                      className="text-[var(--color-accent)] underline underline-offset-2"
                    >
                      Ağacını kur
                    </Link>
                  )}
                </p>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {flat.map((item) => {
                    const entry = progress.get(item.node.id);
                    const done =
                      entry !== undefined &&
                      entry.ratio !== null &&
                      entry.ratio >= 1;

                    return (
                      <li key={item.node.id}>
                        <button
                          type="button"
                          aria-pressed={selectedNodeId === item.node.id}
                          draggable={onDragStart !== undefined}
                          onDragStart={() => onDragStart?.(item.node.id)}
                          onClick={() =>
                            onSelect(
                              selectedNodeId === item.node.id
                                ? null
                                : item.node.id,
                            )
                          }
                          style={{
                            paddingLeft: `calc(${item.level - 1} * 0.75rem + 0.375rem)`,
                          }}
                          className={cn(
                            "w-full rounded py-1 pr-1.5 text-left text-[length:var(--text-xs)]",
                            "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quart)]",
                            selectedNodeId === item.node.id
                              ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                              : "hover:bg-[var(--color-surface-2)]",
                            // Bitmiş kalem soluk ama LİSTEDE KALIR:
                            // kullanıcı neyi bitirdiğini görmek istiyor
                            // (week_goals'ın completed_at gerekçesi).
                            done && "text-[var(--color-ink-3)] line-through",
                          )}
                        >
                          {item.node.title}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {selectedNodeId !== null && (
                <p className="mt-2 text-[length:var(--text-2xs)] leading-relaxed text-[var(--color-accent)]">
                  Şimdi bir güne bas — o başlıktan orada bir görev doğar.
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
