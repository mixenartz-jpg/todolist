"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Field, TextInput } from "@/components/Field";
import { parseSayi } from "./format";
import { ImageDropZone } from "./ImageDropZone";
import {
  DERS_AD_MAX,
  type DenemeYanlisDraft,
  type PendingImage,
} from "./types";

interface YanlisEkleFormProps {
  denemeId: string;
  /** Denemenin ders adları — seçim listesi olarak sunulur. */
  dersler: readonly string[];
  pending: boolean;
  onSubmit: (draft: DenemeYanlisDraft, image: PendingImage | null) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

/**
 * Yanlış ekleme formu — kullanıcının asıl istediği akış.
 *
 * ── Ne SORULMUYOR? ──
 * Konu ve hata türü BURADA sorulmuyor, sonradan etiketleniyor.
 * Gerekçe 0019'da yazılı: deneme biter bitmez kullanıcı fotoğraf
 * çekip geçmek ister; "bu hangi konuydu, neden yanlış yaptım"
 * sorularına o anda verilecek cevap uydurma olur. Etiketleme ayrı
 * bir oturumun işi ("bu soruyu şimdi çözebiliyor muyum?").
 *
 * Yani buradaki tek zorunlu alan DERS. Geri kalan her şey isteğe
 * bağlı ve asıl yol Ctrl+V.
 */
export function YanlisEkleForm({
  denemeId,
  dersler,
  pending,
  onSubmit,
  onCancel,
  onError,
}: YanlisEkleFormProps) {
  /*
   * Ders varsayılanı: denemenin İLK dersi. Boş bırakılsaydı kullanıcı
   * her yanlışta bir seçim yapmak zorunda kalırdı; aynı dersten
   * arka arkaya beş yanlış eklemek yaygın olduğu için bu varsayılan
   * çoğu zaman doğru olanı.
   */
  const [ders, setDers] = useState(dersler[0] ?? "");
  const [soruNo, setSoruNo] = useState("");
  const [image, setImage] = useState<PendingImage | null>(null);

  const soruNoParsed = parseSayi(soruNo, 200);
  const gecerli =
    ders.trim().length > 0 &&
    ders.trim().length <= DERS_AD_MAX &&
    soruNoParsed !== undefined;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!gecerli || pending) return;

    onSubmit(
      {
        denemeId,
        ders: ders.trim(),
        konu: null,
        soruNo: soruNoParsed,
        hataTuru: null,
        note: null,
        imagePath: null,
        imageWidth: null,
        imageHeight: null,
      },
      image,
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_5rem] gap-3">
        <Field label="Ders">
          {(props) => (
            <>
              <TextInput
                {...props}
                value={ders}
                onChange={(e) => setDers(e.target.value)}
                maxLength={DERS_AD_MAX}
                /*
                 * `list`: denemenin dersleri öneri olarak gelir ama
                 * serbest metin de kabul edilir. Katı bir `<select>`
                 * olsaydı, deneme kaydında ayrı satır açılmamış bir
                 * ders ("Coğrafya") için yanlış eklenemezdi.
                 */
                list="deneme-dersleri"
                placeholder="Matematik"
              />
              <datalist id="deneme-dersleri">
                {dersler.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </>
          )}
        </Field>

        <Field label="Soru no">
          {(props) => (
            <TextInput
              {...props}
              inputMode="numeric"
              value={soruNo}
              onChange={(e) => setSoruNo(e.target.value)}
              invalid={soruNoParsed === undefined}
              placeholder="14"
              className="tabular"
            />
          )}
        </Field>
      </div>

      <ImageDropZone onChange={setImage} onError={onError} />

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!gecerli}
          loading={pending}
        >
          Yanlışı ekle
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}
