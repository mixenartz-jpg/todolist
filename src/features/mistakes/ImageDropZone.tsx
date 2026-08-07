"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/Button";
import { cn } from "@/lib/ui/cn";
import { compressImage, ImageTooLargeError } from "./compress";
import { pickImageItem, validateImageInput } from "./image";
import type { PendingImage } from "./types";

interface ImageDropZoneProps {
  /** Mevcut kaydın görseli varsa gösterilecek imzalı URL. */
  existingUrl?: string | null;
  onChange: (image: PendingImage | null) => void;
  onError: (message: string) => void;
}

/**
 * Ekran görüntüsü ekleme alanı.
 *
 * ASIL YOL YAPIŞTIRMADIR: kullanıcı Snipping Tool ile görüntüyü alır ve
 * Ctrl+V'ye basar. Bu yüzden dinleyici `window` üzerindedir — önce
 * alana tıklamayı zorunlu kılmak gerçek bir sürtünme olurdu. Eşleşen
 * görsel yoksa olay hiç tüketilmez ve metin yapıştırması odaklı
 * input'a normal şekilde akar.
 *
 * Dosya seçme ve sürükle-bırak da desteklenir; dosya işleme yolu zaten
 * kurulduğu için ikisi de birkaç satır ek maliyettir.
 */
export function ImageDropZone({
  existingUrl,
  onChange,
  onError,
}: ImageDropZoneProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Önizleme URL'i serbest bırakılmazsa her yapıştırmada bir blob
  // sızar; form birkaç kez açılıp kapandığında bu gözle görülür.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const accept = useCallback(
    async function accept(file: File | Blob) {
      const problem = validateImageInput(file.type, file.size);
      if (problem) {
        onError(problem);
        return;
      }

      setBusy(true);
      try {
        const image = await compressImage(file);
        setPreview(URL.createObjectURL(image.blob));
        onChange(image);
      } catch (error) {
        onError(
          error instanceof ImageTooLargeError
            ? error.message
            : "Görsel işlenemedi, başka bir dosya deneyin.",
        );
      } finally {
        setBusy(false);
      }
    },
    [onChange, onError],
  );

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const items = event.clipboardData?.items;
      if (!items) return;

      const match = pickImageItem([...items]);
      if (!match) return; // Metin yapıştırması: karışma.

      const file = match.getAsFile();
      if (!file) return;

      event.preventDefault();
      void accept(file);
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [accept]);

  function clear() {
    setPreview(null);
    onChange(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void accept(file);
  }

  const shown = preview ?? existingUrl ?? null;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
        Ekran görüntüsü{" "}
        <span className="text-[var(--color-ink-3)]">(isteğe bağlı)</span>
      </span>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "rounded-lg border border-dashed bg-[var(--color-surface-2)] p-3",
          "transition-colors duration-[var(--duration-fast)]",
          dragging
            ? "border-[var(--color-accent)]"
            : "border-[var(--color-line-2)]",
        )}
      >
        {shown ? (
          <div className="flex flex-col gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- imzalı
                URL'de süresi dolan token var; next/image onu tam URL'e göre
                önbelleğe alır ve her yeniden imzalamada ıskalar. */}
            <img
              src={shown}
              alt="Eklenen ekran görüntüsü"
              className="max-h-56 w-auto self-start rounded-md"
            />
            <div>
              <Button type="button" variant="ghost" size="sm" onClick={clear}>
                Görseli kaldır
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2 py-1">
            <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
              {busy
                ? "Görsel hazırlanıyor…"
                : "Ctrl+V ile yapıştır, sürükle ya da dosya seç"}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              Dosya seç
            </Button>
          </div>
        )}

        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void accept(file);
          }}
        />
      </div>
    </div>
  );
}
