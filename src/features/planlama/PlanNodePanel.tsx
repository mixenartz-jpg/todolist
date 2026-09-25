"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Chevron } from "@/components/Chevron";
import { cn } from "@/lib/ui/cn";
import type { DateStr } from "@/lib/date/types";
import { formatDayList, formatRelativeDay } from "@/lib/ui/tr";
import type { Task } from "@/features/tasks/types";
import { nodeDispatch } from "./nodeprogress";
import { useGoalNodes } from "./nodeQueries";
import { buildGoalTree, flattenGoalTree } from "./tree";
import type { PlanGoal } from "./types";
import "./planlama.css";

interface PlanNodePanelProps {
  /** Ayın hedefleri — panel bunlardan birini seçtiriyor. */
  goals: readonly PlanGoal[];
  tasks: readonly Task[];
  /** Gönderilen günün etiketi için ("Bugün", "Yarın"…). */
  today: DateStr;
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
  today,
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

  /*
   * Hangi kalem güne gönderildi? Gönderilen kalemin üstü çizilir ve
   * yanında günü yazar; bitmişse ✓. Eskiden yalnızca %100 BİTEN kalem
   * çiziliyordu: kullanıcı neyi dağıttığını, neyin hâlâ beklediğini
   * ayırt edemiyor ve aynı kalemi iki kez gönderebiliyordu.
   */
  const dispatch = useMemo(() => nodeDispatch(nodes, tasks), [nodes, tasks]);

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
                    const status = dispatch.get(item.node.id);
                    // Tekrarlanan kalem tükenmez: çizilmez, sayısı yazar.
                    const repeat = status?.state === "repeat";
                    const sent =
                      status !== undefined &&
                      status.state !== "none" &&
                      !repeat;
                    const done = status?.state === "done";
                    /*
                     * Birden çok güne gönderilen kalemin günleri başlığın
                     * ALTINDA, hepsi birden ("27, 28, 29 Eylül"). Tek gün
                     * sağda kalır — kısa ve hizalı. Tekrarlananın da
                     * yaklaşan günleri altta görünür.
                     */
                    const ownDays = status?.days ?? [];
                    const dayList =
                      (sent && ownDays.length > 1) || (repeat && ownDays.length > 0)
                        ? formatDayList(ownDays, today)
                        : null;
                    const dayText =
                      status?.state === "sent" && dayList === null
                        ? formatRelativeDay(status.day, today)
                        : null;

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
                            "flex w-full items-start gap-1.5 rounded py-1 pr-1.5 text-left text-[length:var(--text-xs)]",
                            "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quart)]",
                            selectedNodeId === item.node.id
                              ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                              : "hover:bg-[var(--color-surface-2)]",
                          )}
                        >
                          {/* Gönderilen kalem soluk ve çizili ama LİSTEDE
                              KALIR: kullanıcı neyi dağıttığını görmek
                              istiyor (week_goals'ın completed_at
                              gerekçesi). */}
                          <span className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "block",
                                sent && "text-[var(--color-ink-3)] line-through",
                              )}
                            >
                              {item.node.title}
                            </span>
                            {dayList !== null && (
                              <span className="tabular mt-0.5 block text-[length:var(--text-2xs)] text-[var(--color-accent)]">
                                <span className="sr-only">Gönderildiği günler: </span>
                                {dayList}
                              </span>
                            )}
                          </span>

                          {/* Belirteç çizginin DIŞINDA: günün de üstü
                              çizilseydi okunmazdı. Ekran okuyucu çizgiyi
                              görmez; durumu bu metin söyler. */}
                          {dayText !== null && (
                            <span className="tabular shrink-0 whitespace-nowrap text-[length:var(--text-2xs)] text-[var(--color-accent)]">
                              <span className="sr-only">Gönderildi: </span>
                              {dayText}
                            </span>
                          )}
                          {repeat && (
                            <span
                              title="Tekrarlanan kalem"
                              className="tabular shrink-0 whitespace-nowrap text-[length:var(--text-2xs)] text-[var(--color-accent)]"
                            >
                              <span aria-hidden>↻ </span>
                              <span className="sr-only">Tekrarlanan kalem, </span>
                              {status!.count > 0 ? `${status!.count}×` : "tekrarlı"}
                            </span>
                          )}
                          {done && (
                            <span className="shrink-0 text-[length:var(--text-2xs)] text-[var(--color-good)]">
                              <span aria-hidden>✓</span>
                              <span className="sr-only">Tamamlandı</span>
                            </span>
                          )}
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
