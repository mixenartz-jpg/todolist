"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/ui/cn";
import { RailEmpty } from "@/features/today/RailGoalRow";
import "@/components/list-motion.css";
import {
  useCreateShoppingItem,
  useDeleteShoppingItem,
  useToggleShoppingItem,
} from "./mutations";
import { useShoppingItems } from "./queries";
import { nextSortOrder, normalizeTitleInput } from "./sort";
import { SHOPPING_TITLE_MAX, type ShoppingItem } from "./types";

/**
 * Alınacaklar kartı — rayın tek ÇALIŞMA DIŞI bloğu.
 *
 * ── Neden `TaskItem` değil? ──
 * `PlanBacklog`'un aynı gerekçesi: `TaskItem` saat çipi, gün taşıma
 * seçicisi ve erteleme düğmesi taşıyor. Burada tek eylem "aldım"
 * demek; o üç kontrol iki kelimelik bir kalemi gürültüye boğardı.
 *
 * ── Neden `TaskQuickAdd` yeniden kullanılmıyor? ──
 * O bileşen `dueDate` alıp GÖREV yazıyor ve bu listenin tarihi yok.
 * Ondan devralınan şey davranıştır, kod değil: Enter kaydeder, alan
 * temizlenir ve odakta kalır, düğme yalnızca metin varken görünür.
 * Boyutlar rayın ölçeğine indi (h-11 → h-9, text-base → text-sm),
 * çünkü ray dar bir özet sütunu.
 *
 * ── Neden `Card` sarmalamıyor? ──
 * `Card.tsx`'in doktrini iç içe kartı yasaklıyor ve rayın öteki
 * blokları (`RailWeekGoals`, `RailMonthGoals`) da düz `<section>`
 * kullanıyor. Başlık çağıran tarafta (`DayRail`) — `RailWeekGoals`
 * ile aynı iş bölümü.
 */
export function ShoppingCard({
  onError,
}: {
  onError?: (message: string) => void;
}) {
  const itemsQuery = useShoppingItems();
  const createItem = useCreateShoppingItem(onError);
  const toggleItem = useToggleShoppingItem(onError);
  const deleteItem = useDeleteShoppingItem(onError);

  const [title, setTitle] = useState("");

  const items = itemsQuery.data ?? [];

  // Yüklenirken hiçbir şey çizilmez: rayda iskelet, dört blok için
  // dört ayrı titreşim demekti (`RailWeekGoals` ile aynı karar).
  if (itemsQuery.isPending) return null;

  /*
   * Hata boş listeden AYRI gösterilir. İkisi de "liste boş" diye
   * çizilseydi, kalemleri olan ama sorgusu düşen kullanıcı onları
   * silinmiş sanardı — sessiz veri kaybı görüntüsü.
   */
  if (itemsQuery.isError) {
    return <RailEmpty>Alınacaklar yüklenemedi.</RailEmpty>;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    /*
     * Uçuşta bir ekleme varken ikincisi ALINMAZ.
     *
     * Ekleme optimistic değil (gerekçesi `useCreateShoppingItem`'da):
     * satır ancak sunucu yanıtı `qk.shoppingItems()`'i tazeleyince
     * listeye giriyor. O ana kadar `items` ESKİ anlık görüntüdür ve
     * arka arkaya basılan iki Enter, `nextSortOrder`'a aynı listeyi
     * verip aynı `sort_order`'ı iki kez üretirdi — `nextSortOrder`'ın
     * silme deliği için kapattığı çakışmanın eşzamanlılık hâli.
     *
     * Düğmenin `disabled`'ı bu işi GÖRMEZ: form Enter ile de
     * gönderiliyor ve düğme `title.trim()` boşalınca zaten DOM'dan
     * kalkıyor. Kapı bu yüzden burada, gönderme yolunun tamamının
     * geçtiği tek noktada duruyor.
     */
    if (createItem.isPending) return;

    const normalized = normalizeTitleInput(title);
    if (normalized === null) return;

    createItem.mutate({ title: normalized, sortOrder: nextSortOrder(items) });
    setTitle("");
  }

  return (
    <>
      {items.length === 0 ? (
        <RailEmpty>Alınacak bir şey yok.</RailEmpty>
      ) : (
        <ul className="mb-2 flex flex-col">
          {items.map((item) => (
            <ShoppingRow
              key={item.id}
              item={item}
              onToggle={() =>
                toggleItem.mutate({
                  id: item.id,
                  completedAt:
                    item.completedAt === null ? new Date().toISOString() : null,
                })
              }
              onDelete={() => deleteItem.mutate(item.id)}
            />
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="mt-1.5 flex items-center gap-1.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={SHOPPING_TITLE_MAX}
          placeholder="Ekle"
          aria-label="Alınacak ekle"
          className={cn(
            "h-9 min-w-0 flex-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5",
            "text-[length:var(--text-sm)] outline-none",
            "transition-colors duration-[var(--duration-fast)]",
            "placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-line-3)]",
          )}
        />

        {/* Düğme yalnızca yazılmışken görünür — `TaskQuickAdd` ile aynı:
            boş bir formda "Ekle" düğmesi tıklanacak ama hiçbir şey
            yapmayacak bir hedeftir. */}
        {title.trim() && (
          <button
            type="submit"
            disabled={createItem.isPending}
            className={cn(
              "h-9 shrink-0 rounded-lg bg-[var(--color-accent-fill)] px-3",
              "text-[length:var(--text-sm)] font-medium text-[var(--color-on-accent)]",
              "transition-colors duration-[var(--duration-fast)]",
              "hover:bg-[var(--color-accent-hover)] disabled:opacity-50",
            )}
          >
            Ekle
          </button>
        )}
      </form>
    </>
  );
}

/**
 * Tek kalem satırı.
 *
 * Kutu `<button>` değil `<input type="checkbox">`: burada durum ikili
 * ve kalıcı, yani checkbox'ın tam olarak anlattığı şey. `RailGoalRow`'un
 * artı düğmesi bir SAYACI ilerletiyordu ve o bir düğmedir — aynı
 * görünüm, farklı semantik.
 */
function ShoppingRow({
  item,
  onToggle,
  onDelete,
}: {
  item: ShoppingItem;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const done = item.completedAt !== null;

  return (
    <li className="rowEnter revealOnHover flex items-center gap-2 py-1">
      <input
        type="checkbox"
        checked={done}
        onChange={onToggle}
        aria-label={`${item.title}: ${done ? "alınmadı" : "alındı"} olarak işaretle`}
        className="size-3.5 shrink-0 accent-[var(--color-accent)]"
      />

      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[length:var(--text-sm)]",
          done
            ? "text-[var(--color-ink-3)] line-through"
            : "text-[var(--color-ink-2)]",
        )}
        title={item.title}
      >
        {item.title}
      </span>

      {/* Silme onay diyaloğu SORMAZ. `ConfirmDialog` geri alınamayan ve
          pahalı kayıplar içindir (rutin, kategori); burada kaybedilen
          şey iki kelimelik bir hatırlatıcı ve her silmede bir diyalog,
          listeyi eritmeyi angaryaya çevirirdi. */}
      <button
        type="button"
        onClick={onDelete}
        aria-label={`${item.title}: sil`}
        className={cn(
          "revealTarget grid size-5 shrink-0 place-items-center rounded-md opacity-0",
          "text-[var(--color-ink-3)]",
          "transition-[opacity,color] duration-[var(--duration-fast)]",
          "hover:text-[var(--color-danger)] focus-visible:opacity-100",
        )}
      >
        <svg
          viewBox="0 0 12 12"
          className="size-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M3 3l6 6M9 3l-6 6" />
        </svg>
      </button>
    </li>
  );
}
