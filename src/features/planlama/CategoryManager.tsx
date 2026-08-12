"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/ui/cn";
import { ColorSlotPicker } from "./ColorSlotPicker";
import { CategoryDot } from "./CategoryDot";
import {
  CATEGORY_NAME_MAX,
  isDuplicateCategoryName,
  normalizeCategoryName,
} from "./goal";
import {
  useArchiveCategory,
  useCreateCategory,
  useDeleteCategory,
  useRenameCategory,
  useSetCategoryColor,
} from "./mutations";
import type { Category } from "./types";

interface CategoryManagerProps {
  categories: readonly Category[];
  onError: (message: string) => void;
}

/**
 * Kategori yönetimi — oluştur, adlandır, renklendir, arşivle, sil.
 *
 * ── Neden ayrı bir SEKME değil? ──
 * Bu iş yılda birkaç kez yapılır; beşinci bir üst sekme ona hedeflerle
 * eşit ağırlık verirdi. Yeri Özet sekmesindeki dağılımın altı:
 * kullanıcı kategorilerine zaten oraya bakarken karar verir ("bu
 * kategori hiç kullanılmamış, kaldırayım").
 *
 * ── Neden arşiv ÖNE ÇIKIYOR, silme geride? ──
 * Silmek bağlı görevlerin `category_id`'sini null'a düşürür (0008) ve
 * geçmiş ay dağılımları geriye dönük değişir. Arşiv geçmişi korur ve
 * geri alınabilir; silme onay ister ve sonucunu açıkça söyler.
 */
export function CategoryManager({ categories, onError }: CategoryManagerProps) {
  const createCategory = useCreateCategory(onError);
  const [name, setName] = useState("");
  const [colorSlot, setColorSlot] = useState(0);

  const trimmed = normalizeCategoryName(name);
  const duplicate = trimmed !== null && isDuplicateCategoryName(categories, trimmed);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (trimmed === null || duplicate) return;

    createCategory.mutate(
      { name: trimmed, colorSlot, sortOrder: categories.length },
      {
        onSuccess: () => {
          setName("");
          // Renk bir sonraki slota kayar: art arda kategori ekleyen
          // kullanıcı hepsini aynı renkte yapmasın diye. Palet
          // sekizlik, mod ile başa döner.
          setColorSlot((slot) => (slot + 1) % 8);
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {categories.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              categories={categories}
              onError={onError}
            />
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-1">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={CATEGORY_NAME_MAX}
            placeholder="Yeni kategori (Matematik, Spor…)"
            aria-label="Yeni kategori adı"
            aria-invalid={duplicate}
            className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[length:var(--text-base)] placeholder:text-[var(--color-ink-3)]"
          />

          {/* Uyarı sunucuya varmadan görünür. DB kısıtı (unique) son
              savunma; asıl deneyim burası (bkz. goal.ts). */}
          {duplicate && (
            <p
              role="alert"
              className="text-[length:var(--text-xs)] text-[var(--color-warn)]"
            >
              Bu adda bir kategori zaten var.
            </p>
          )}
        </div>

        <ColorSlotPicker
          value={colorSlot}
          onChange={setColorSlot}
          legend="Kategori rengi"
        />

        <div>
          <Button
            type="submit"
            size="sm"
            disabled={trimmed === null || duplicate}
            loading={createCategory.isPending}
          >
            Ekle
          </Button>
        </div>
      </form>
    </div>
  );
}

function CategoryRow({
  category,
  categories,
  onError,
}: {
  category: Category;
  categories: readonly Category[];
  onError: (message: string) => void;
}) {
  const renameCategory = useRenameCategory(onError);
  const setColor = useSetCategoryColor(onError);
  const archiveCategory = useArchiveCategory(onError);
  const deleteCategory = useDeleteCategory(onError);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(category.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const archived = category.archivedAt !== null;

  const trimmed = normalizeCategoryName(draft);
  const duplicate =
    trimmed !== null && isDuplicateCategoryName(categories, trimmed, category.id);

  function commit() {
    setEditing(false);
    // Değişmemişse ya da geçersizse hiçbir şey yazma: gereksiz bir
    // yazma, `updated_at`'i boşuna oynatır.
    if (trimmed === null || duplicate || trimmed === category.name) {
      setDraft(category.name);
      return;
    }
    renameCategory.mutate({ id: category.id, name: trimmed });
  }

  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5",
        archived && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2">
        <CategoryDot category={category} />

        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
              if (event.key === "Escape") {
                setDraft(category.name);
                setEditing(false);
              }
            }}
            maxLength={CATEGORY_NAME_MAX}
            aria-label={`${category.name} adını değiştir`}
            aria-invalid={duplicate}
            className="min-w-0 flex-1 rounded-md border border-[var(--color-accent)] bg-[var(--color-surface-2)] px-2 py-1 text-[length:var(--text-base)]"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`${category.name} adını değiştir`}
            className="min-w-0 flex-1 truncate text-left text-[length:var(--text-base)] hover:text-[var(--color-accent)]"
          >
            {category.name}
            {archived && (
              <span className="ml-1.5 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
                arşivde
              </span>
            )}
          </button>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            archiveCategory.mutate({ id: category.id, archived: !archived })
          }
        >
          {archived ? "Geri al" : "Arşivle"}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setConfirmDelete(true)}
          aria-label={`${category.name} kategorisini sil`}
        >
          Sil
        </Button>
      </div>

      {!archived && (
        <ColorSlotPicker
          value={category.colorSlot}
          onChange={(slot) => setColor.mutate({ id: category.id, colorSlot: slot })}
          legend={`${category.name} rengi`}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`"${category.name}" silinsin mi?`}
          /* Sonucu AÇIKÇA söyler: kullanıcı görevlerinin de gideceğini
             sanmamalı. Arşiv alternatifi de burada hatırlatılır. */
          description="Bu kategorideki görevler silinmez, kategorisiz olur. Geçmiş ay dağılımlarını korumak istiyorsan silmek yerine arşivle."
          confirmLabel="Sil"
          onConfirm={() => {
            deleteCategory.mutate(category.id);
            setConfirmDelete(false);
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </li>
  );
}
