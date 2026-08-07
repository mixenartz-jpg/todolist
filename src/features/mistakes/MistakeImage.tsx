"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/ui/cn";
import { useMistakeImageUrl } from "./queries";

interface MistakeImageProps {
  path: string;
  width: number | null;
  height: number | null;
  alt: string;
}

/**
 * Yanlışın ekran görüntüsü.
 *
 * ── Neden `next/image` DEĞİL? ──
 * İmzalı URL'de süresi dolan bir `?token=` var. Optimizer çıktıyı TAM
 * URL'e göre önbelleğe alır; her yeniden imzalamada ıska geçer ve
 * önbellekte ölü kayıtlar birikir. Görseller zaten istemcide
 * sıkıştırıldığı için optimizer bir şey katmıyor.
 *
 * Saklanan boyutlar iskelet kutusunu ve `<img>` niteliklerini besler:
 * boyut bilinmeden yerleştirilirse liste her görsel yüklendiğinde
 * zıplar.
 */
export function MistakeImage({ path, width, height, alt }: MistakeImageProps) {
  const { data: url, isPending, error } = useMistakeImageUrl(path);
  const [broken, setBroken] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  // Escape ile kapat: büyütülmüş görsel bir kipliktir ve klavyeyle
  // çıkılabilmelidir.
  useEffect(() => {
    if (!zoomed) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setZoomed(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomed]);

  const ratio = width && height ? width / height : 4 / 3;

  if (error || broken) {
    return (
      <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
        Görsel yüklenemedi
      </div>
    );
  }

  if (isPending || !url) {
    return (
      <div
        aria-hidden
        className="w-full max-w-sm animate-pulse rounded-lg bg-[var(--color-surface-2)]"
        style={{ aspectRatio: String(ratio) }}
      />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setZoomed(true)}
        aria-label={`${alt} — büyüt`}
        className={cn(
          "block max-w-sm overflow-hidden rounded-lg",
          "transition-opacity duration-[var(--duration-fast)] hover:opacity-90",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- yukarıdaki
            açıklamaya bakın: imzalı URL next/image ile uyumsuz. */}
        <img
          src={url}
          alt={alt}
          width={width ?? undefined}
          height={height ?? undefined}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          className="h-auto w-full"
        />
      </button>

      {zoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setZoomed(false)}
          className={cn(
            "fixed inset-0 z-[var(--z-modal)] grid place-items-center",
            "bg-[rgb(0_0_0/0.8)] p-4",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- aynı gerekçe. */}
          <img
            src={url}
            alt={alt}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
}
