"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/Button";
import "./confirm-dialog.css";

interface ConfirmDialogProps {
  title: string;
  /** Ne olacağını açıkça söyler. Geri alınamaz eylemde bunu yumuşatma. */
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  /**
   * Onay düğmesinin görünümü.
   *
   * Varsayılan `danger`, çünkü bu kutunun asıl işi yıkıcı eylemlerdir.
   * Ama her onay yıkıcı değildir: toplu yeniden adlandırma geri
   * alınabilir bir işlemdir ve onu da kırmızı göstermek, kullanıcıya
   * kırmızıyı yok saymayı öğretirdi.
   */
  confirmVariant?: "danger" | "primary";
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Yıkıcı eylem onayı.
 *
 * Native `confirm()` yerine geçer: tarayıcının kutusu tasarım sisteminin
 * dışında kalıyor, iş parçacığını bloke ediyor ve mobilde alan adını
 * gösteriyordu. `<dialog>` odak tuzağını ve Esc'i bedavaya verir.
 *
 * Onay kutusu yalnızca gerçekten geri alınamaz eylemler içindir; her
 * yerde kullanılırsa kullanıcı okumadan tıklamayı öğrenir.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Vazgeç",
  confirmVariant = "danger",
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    /*
     * Zaten açıksa tekrar açma: `showModal()` açık bir `<dialog>`
     * üzerinde `InvalidStateError` fırlatır. Strict Mode geliştirme
     * modunda efektler mount → cleanup → mount sırasıyla iki kez
     * çalışır; bu koruma olmadan ikinci çağrı patlıyordu.
     */
    if (!dialog.open) dialog.showModal();

    /*
     * Temizlemede `close()` ÇAĞRILMAZ.
     *
     * Sökülen bir `<dialog>` tarayıcı tarafından zaten üst katmandan
     * düşürülür; ayrıca kapatmak gerekmez. Kapatmak `close` olayını
     * tetikler, o da `onCancel`'ı çağırır ve React sökülme sırasında
     * durum güncellemesi görür. Bunu bir bayrakla ayıklamayı denemek
     * yarış koşulu üretiyor: olay eşzamansız geldiği için bayrak
     * yeniden kurulumda çoktan sıfırlanmış oluyor.
     */
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      onClick={(event) => {
        // Zemine tıklayınca kapat. `<dialog>` zemini kendisidir.
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
      aria-labelledby="confirmTitle"
      aria-describedby="confirmDescription"
      className="confirmDialog"
    >
      <div className="confirmPanel">
        <h2
          id="confirmTitle"
          className="text-[length:var(--text-lg)] font-semibold tracking-[-0.01em]"
        >
          {title}
        </h2>

        <p
          id="confirmDescription"
          className="mt-2 text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]"
        >
          {description}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => dialogRef.current?.close()}
          >
            {cancelLabel}
          </Button>
          <Button
            size="sm"
            variant={confirmVariant}
            loading={pending}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
