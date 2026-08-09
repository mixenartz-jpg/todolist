"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import {
  normalizeLabelInput,
  SECTION_LABEL_MAX,
  shouldPersistLabel,
  type SectionKey,
} from "@/lib/ui/sections";
import { useSectionLabel } from "./queries";
import { useSetSectionLabel } from "./mutations";

interface SectionHeadingProps {
  sectionKey: SectionKey;
  /** Başlık seviyesi. Bugün ekranında h2, gün panelinde h3. */
  as?: "h2" | "h3";
  /** Başlığın sağında duran ek içerik (ör. sayı rozeti). */
  trailing?: ReactNode;
  onError?: (message: string) => void;
}

/*
 * Başlık ve düzenleme kutusu AYNI tipografiyi paylaşır: kutuya
 * geçişte metin yerinden oynarsa düzenleme bir "mod değişimi" gibi
 * hissedilir, oysa yapılan şey aynı kelimeyi yeniden yazmaktır.
 */
const TEXT = "text-[length:var(--text-sm)] font-medium";

/**
 * Yeniden adlandırılabilir bölüm başlığı.
 *
 * ── Neden kalem simgesi YOK? ──
 * Dört başlığın yanında kalıcı bir kalem, neredeyse hiç kullanılmayacak
 * bir kontrolü her gün göstermek olurdu. Başlığın kendisi hedeftir;
 * imleç ve hover rengi tek ipucudur. Nadir bir eylem, kalıcı bir
 * yüzey hak etmez.
 *
 * ── Neden `contenteditable` DEĞİL? ──
 * Yapıştırılan metnin biçimlendirmesini yutar, `maxLength` bilmez ve
 * mobil IME davranışı öngörülemez. Sıradan bir `<input>` hepsini
 * bedavaya doğru yapar.
 *
 * ── Varsayılana dönüş: alanı boşaltıp Enter ──
 * Ayrı bir "sıfırla" düğmesi beşinci bir kontrol demekti; alanı
 * boşaltmak zaten "adı yok" demenin doğal yoludur
 * (bkz. normalizeLabelInput).
 *
 * ── Neden `<h2>` İÇİNDE `<button>`? ──
 * Tıklanabilir bir `<h2>` odaklanamaz ve ekran okuyucuya buton olarak
 * duyurulmaz. Başlık anlamı dış öğede, etkileşim iç öğede kalır.
 */
export function SectionHeading({
  sectionKey,
  as: Tag = "h2",
  trailing,
  onError,
}: SectionHeadingProps) {
  const label = useSectionLabel(sectionKey);
  const setLabel = useSetSectionLabel(onError);
  const [editing, setEditing] = useState(false);

  /** Esc'e basıldı mı? `onBlur`'un kaydetmesini engeller — bkz. onBlur. */
  const cancelledRef = useRef(false);

  function save(value: string) {
    setEditing(false);

    const next = normalizeLabelInput(sectionKey, value);
    if (!shouldPersistLabel(sectionKey, label, next)) return;

    setLabel.mutate({ key: sectionKey, label: next });
  }

  return (
    <div className="mb-2.5 flex items-center gap-1.5">
      <Tag className={cn(TEXT, "text-[var(--color-ink-2)]")}>
        {editing ? (
          <input
            autoFocus
            defaultValue={label}
            maxLength={SECTION_LABEL_MAX}
            aria-label={`${label} bölümünün adı`}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => {
              /*
               * Esc ile kapatıldıysa KAYDETME.
               *
               * `setEditing(false)` odağı eşzamanlı bırakmaz: React
               * input'u sökerken tarayıcı hâlâ odaktaki elemana bir
               * `blur` gönderir ve bu, kayıtlı `onBlur`'u çalıştırır.
               * Yani "önce durumu kapat" yeterli değildir — Esc, tam
               * da iptal etmesi gereken yazıyı kaydederdi. Bayrak bu
               * sırayı kırar.
               */
              if (cancelledRef.current) {
                cancelledRef.current = false;
                return;
              }
              save(e.currentTarget.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save(e.currentTarget.value);
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelledRef.current = true;
                setEditing(false);
              }
            }}
            className={cn(
              TEXT,
              "w-32 rounded-sm bg-[var(--color-surface-2)] px-1 py-0.5",
              "text-[var(--color-ink)] outline-none",
              "ring-1 ring-[var(--color-accent)]",
            )}
          />
        ) : (
          <button
            type="button"
            title="Yeniden adlandır"
            onClick={() => setEditing(true)}
            className={cn(
              "cursor-text rounded-sm px-1 py-0.5 -mx-1",
              "transition-colors duration-[var(--duration-fast)]",
              "hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]",
            )}
          >
            {label}
          </button>
        )}
      </Tag>

      {trailing}
    </div>
  );
}
