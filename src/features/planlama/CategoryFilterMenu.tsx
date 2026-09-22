"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/ui/cn";
import { slotVar } from "@/lib/ui/colors";
import { CategoryFilterBar } from "./CategoryFilterBar";
import type { Category, CategoryFilter } from "./types";

interface CategoryFilterMenuProps {
  categories: readonly Category[];
  value: CategoryFilter;
  onChange: (next: CategoryFilter) => void;
  counts: ReadonlyMap<string, number>;
  uncategorizedCount: number;
}

/**
 * Kategori filtresi — düğmenin arkasında.
 *
 * ── Neden gizlendi? ──
 * Çipler başlık şeridinde açıkta duruyordu ve kategori sayısı arttıkça
 * ikinci satıra sarıyorlardı. Ama filtre NADİREN kullanılan bir ayar:
 * kullanıcı plan ekranını "bu hafta ne var" diye açıyor, "yalnızca
 * matematik" diye değil. Her açılışta yer kaplayan bir kontrol,
 * ekranın asıl işini aşağı itiyordu.
 *
 * Gizlemek onu ERİŞİLEMEZ yapmıyor: düğme her zaman görünür ve filtre
 * AÇIKKEN düğme kategorinin adını ve rengini taşıyor — yani "süzülmüş
 * bir liste görüyorum" bilgisi hiçbir zaman kaybolmuyor. Filtrenin
 * sessizce açık kalması, boş bir ızgaraya bakıp "işlerim nerede"
 * demenin en kolay yoluydu.
 */
export function CategoryFilterMenu({
  categories,
  value,
  onChange,
  counts,
  uncategorizedCount,
}: CategoryFilterMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /*
   * Dışarı tıklama ve Esc ile kapanır.
   *
   * `pointerdown`, `click` DEĞİL: `click` hedefin üzerinde bırakmayı
   * bekliyor ve kullanıcı menünün dışında basıp içinde bıraktığında
   * menü kapanmazdı. Basma anı niyeti daha doğru yakalıyor.
   */
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Hiç kategori yoksa düğme de çizilmez — `CategoryFilterBar`'ın
  // aynı kararı, bir katman yukarıda: kullanılamayacak bir kontrolü
  // göstermemek.
  if (categories.length === 0) return null;

  const secili =
    value === null
      ? null
      : value === "none"
        ? { ad: "Etiketsiz", renk: null }
        : (() => {
            const c = categories.find((x) => x.id === value);
            return c ? { ad: c.name, renk: slotVar(c.colorSlot) } : null;
          })();

  return (
    <div ref={ref} className="relative">
      {/*
        * İki KARDEŞ düğme, iç içe DEĞİL.
        *
        * Önce temizleme `×`'i açma düğmesinin İÇİNDE bir
        * `role="button"` span'di ve `stopPropagation` ile çalışıyordu.
        * İşlevsel olarak doğruydu ama etkileşimli bir öğeyi gerçek bir
        * `<button>`'ın içine koymak geçersiz HTML: tarayıcılar iç
        * öğeyi erişilebilirlik ağacından düşürebiliyor (klavye
        * kullanıcısı `×`'e hiç ulaşamaz) ve dış düğmenin erişilebilir
        * adı iç metinle kirleniyor ("Süz × Filtreyi kaldır").
        *
        * Sarmalayıcı bir `<div>` ve yan yana iki düğme aynı görünümü
        * veriyor — ortak kenarlık `div`'e taşındı, düğmeler
        * kenarlıksız.
        */}
      <div
        className={cn(
          "flex h-8 items-center rounded-lg border",
          "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quart)]",
          /*
           * Filtre AÇIKKEN şerit accent taşır. Bu dekorasyon değil
           * durum bildirimi: süzülmüş bir listeye bakarken bunu
           * söyleyen tek işaret bu kontrol.
           */
          secili !== null
            ? "border-[var(--color-accent)] bg-[color-mix(in_oklch,var(--color-accent)_14%,transparent)] text-[var(--color-ink)]"
            : "border-[var(--color-line-2)] bg-[var(--color-surface-2)] text-[var(--color-ink-2)]",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="true"
          className={cn(
            "flex h-full items-center gap-1.5 rounded-l-lg px-2.5",
            "text-[length:var(--text-xs)]",
            "transition-colors duration-[var(--duration-fast)]",
            secili === null && "hover:text-[var(--color-ink)]",
            // Tek düğme kaldığında sağ köşe de yuvarlanmalı.
            secili === null && "rounded-r-lg",
          )}
        >
          {secili?.renk != null && (
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ background: secili.renk }}
            />
          )}
          <span className="max-w-28 truncate">{secili?.ad ?? "Süz"}</span>
        </button>

        {/*
          * Temizleme yalnızca filtre açıkken. Menüyü açıp "Hepsi"ye
          * basmak da çalışıyor; bu bir adım kısaltıyor.
          */}
        {secili !== null && (
          <button
            type="button"
            aria-label="Filtreyi kaldır"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            /* 28×32: WCAG 2.2'nin 24px asgarisinin üstünde. Şeridin
               tamamı 8 birim yüksek olduğu için 44px'e çıkarmak
               kontrolü orantısız büyütürdü — `tap-check.mjs`'in
               "asgari 24px" ölçütü burada geçerli ölçüt. */
            className="grid h-full w-7 shrink-0 place-items-center rounded-r-lg text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-ink)]"
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <div
          className={cn(
            /* `--z-dropdown` (20), yapışkan başlığın (10) üstünde:
               menü başlık şeridinden açılıyor ve altında kalsaydı
               yarısı görünmezdi. Katman sırası token'dan gelir —
               globals.css'in kuralı: "asla rastgele z-index yok". */
            "absolute left-0 top-full z-[var(--z-dropdown)] mt-1.5 w-max max-w-[min(20rem,calc(100vw-2rem))]",
            "rounded-xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-2.5",
            "shadow-[var(--shadow-raised)]",
          )}
        >
          <CategoryFilterBar
            categories={categories}
            value={value}
            counts={counts}
            uncategorizedCount={uncategorizedCount}
            /*
             * Seçim menüyü KAPATIR: filtre tek seçimli, ikinci bir
             * çipe basmak ilkini değiştirir. Açık kalsaydı kullanıcı
             * sonucu görmek için ayrıca kapatmak zorunda kalırdı.
             */
            onChange={(next) => {
              onChange(next);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
