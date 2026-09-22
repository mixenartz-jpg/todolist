"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/Button";
import { Field, TextInput } from "@/components/Field";
import { todayStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { formatNet, parseSayi } from "./format";
import { hesaplaNet, toplamNet } from "./net";
import {
  baslangicSatirlari,
  cozumleSatir,
  kaydedilecekDersler,
  satirlarGecerli,
  type CozumlenmisSatir,
  type DersSatiri,
} from "./satir";
import {
  aytAlanGerekir,
  varsayilanAd,
  type DenemeAlan,
  type DenemeTur,
} from "./sinav";
import { DENEME_AD_MAX, SURE_DK_MAX, type DenemeDraft } from "./types";

/**
 * Deneme giriş formu.
 *
 * ── Tasarım kısıtı: ~30 SANİYE ──
 * Alan araştırmasının en sert bulgusu: deneme kaydı angarya olursa
 * uygulama üçüncü haftada ölür. Bu formun her kararı o bütçeden
 * çıkıyor:
 *
 *   · Tür seçilince ders satırları KENDİLİĞİNDEN gelir
 *   · Ad kendiliğinden önerilir, üstüne yazılabilir
 *   · İki sayı girilir, üçüncüsü (`boş`) türetilir
 *   · Net her tuşta canlı hesaplanır — kaydetmeden görünür
 *   · Tarih varsayılan bugün
 *
 * Kullanıcının YAZMAK ZORUNDA olduğu tek şey doğru ve yanlış
 * sayıları. Diğer her alanın çalışan bir varsayılanı var.
 *
 * Satır mantığı burada DEĞİL (`satir.ts`): hangi satırın kaydedileceği
 * kararı saf ve testli olmalı — bkz. o dosyanın başlığı.
 */

interface DenemeFormProps {
  pending: boolean;
  onSubmit: (draft: DenemeDraft) => void;
  onCancel?: () => void;
}

const TURLER: { tur: DenemeTur; ad: string }[] = [
  { tur: "tyt", ad: "TYT" },
  { tur: "ayt", ad: "AYT" },
  { tur: "brans", ad: "Branş" },
  { tur: "ydt", ad: "YDT" },
];

const ALANLAR: { alan: DenemeAlan; ad: string }[] = [
  { alan: "say", ad: "Sayısal" },
  { alan: "ea", ad: "Eşit Ağırlık" },
  { alan: "soz", ad: "Sözel" },
  { alan: "dil", ad: "Dil" },
];

export function DenemeForm({ pending, onSubmit, onCancel }: DenemeFormProps) {
  const bugun = todayStr();

  const [tur, setTur] = useState<DenemeTur>("tyt");
  const [alan, setAlan] = useState<DenemeAlan | null>(null);
  const [tarih, setTarih] = useState<DateStr>(bugun);
  const [sure, setSure] = useState("");
  const [satirlar, setSatirlar] = useState<DersSatiri[]>(() =>
    baslangicSatirlari("tyt", null),
  );

  /*
   * Ad AYRI tutuluyor: kullanıcı üstüne yazdıysa tür değişince
   * ezilmemeli. `null` = "henüz dokunmadım, öneriyi kullan".
   */
  const [adOverride, setAdOverride] = useState<string | null>(null);
  const ad = adOverride ?? varsayilanAd(tur, tarih);

  function turDegistir(yeniTur: DenemeTur) {
    setTur(yeniTur);

    /*
     * AYT'den çıkarken alan TEMİZLENİR: veritabanı kısıtı (0018
     * `deneme_alan_tutarli`) AYT olmayan bir satırda alan kabul
     * etmez. Temizlenmeseydi kullanıcı AYT-SAY seçip TYT'ye dönünce
     * kaydetme anında anlaşılmaz bir sunucu hatası alırdı.
     */
    const yeniAlan = aytAlanGerekir(yeniTur) ? alan : null;
    setAlan(yeniAlan);
    setSatirlar(baslangicSatirlari(yeniTur, yeniAlan));
  }

  function alanDegistir(yeniAlan: DenemeAlan) {
    setAlan(yeniAlan);
    setSatirlar(baslangicSatirlari(tur, yeniAlan));
  }

  function satirGuncelle(index: number, patch: Partial<DersSatiri>) {
    setSatirlar((list) =>
      list.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  function satirEkle() {
    setSatirlar((list) => [
      ...list,
      {
        ders: "",
        dogru: "",
        yanlis: "",
        soruSayisi: "",
        sortOrder: list.length,
      },
    ]);
  }

  function satirSil(index: number) {
    setSatirlar((list) => list.filter((_, i) => i !== index));
  }

  const cozumler = satirlar.map(cozumleSatir);
  const gecerli =
    ad.trim().length > 0 &&
    ad.trim().length <= DENEME_AD_MAX &&
    sureGecerli(sure) &&
    satirlarGecerli(cozumler);

  /*
   * Net YALNIZCA dolu satırlardan. Yarım doldurulmuş bir satır
   * hesaba katılsaydı toplam, kullanıcının henüz girmediği bir
   * dersi 0 net saymış olurdu.
   */
  const net = toplamNet(
    cozumler.filter((c) => c.deger !== null).map((c) => c.deger!),
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!gecerli || pending) return;

    onSubmit({
      ad: ad.trim(),
      tur,
      alan: aytAlanGerekir(tur) ? alan : null,
      tarih,
      sureDk: sure.trim() === "" ? null : Number(sure),
      note: null,
      dersler: kaydedilecekDersler(cozumler),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Tür — ilk karar, çünkü ders satırlarını O belirliyor. */}
      <fieldset>
        <legend className="mb-1.5 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          Deneme türü
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {TURLER.map((t) => (
            <SecimDugmesi
              key={t.tur}
              secili={tur === t.tur}
              onClick={() => turDegistir(t.tur)}
            >
              {t.ad}
            </SecimDugmesi>
          ))}
        </div>
      </fieldset>

      {/* Alan yalnızca AYT'de görünür — 0018 kısıtının ekran karşılığı. */}
      {aytAlanGerekir(tur) && (
        <fieldset>
          <legend className="mb-1.5 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            Alan
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {ALANLAR.map((a) => (
              <SecimDugmesi
                key={a.alan}
                secili={alan === a.alan}
                onClick={() => alanDegistir(a.alan)}
              >
                {a.ad}
              </SecimDugmesi>
            ))}
          </div>
        </fieldset>
      )}

      <Field label="Deneme adı">
        {(props) => (
          <TextInput
            {...props}
            value={ad}
            onChange={(e) => setAdOverride(e.target.value)}
            maxLength={DENEME_AD_MAX}
            placeholder="3D Yayınları TYT-7"
            /* Marka anı: denemenin adı el yazısıyla — kullanıcının
               "ismini büyükçe yazayım" isteğinin karşılığı. Gövde ve
               sayılar Inter kalır (bkz. planın A2 kararı). */
            className="font-hand text-[length:var(--text-lg)]"
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tarih">
          {(props) => (
            <TextInput
              {...props}
              type="date"
              value={tarih}
              onChange={(e) => setTarih(e.target.value as DateStr)}
              className="tabular"
            />
          )}
        </Field>

        <Field
          label="Süre (dk)"
          error={sureGecerli(sure) ? undefined : "1–400 arası bir sayı"}
        >
          {(props) => (
            <TextInput
              {...props}
              inputMode="numeric"
              value={sure}
              onChange={(e) => setSure(e.target.value)}
              placeholder="135"
              className="tabular"
            />
          )}
        </Field>
      </div>

      <DersTablosu
        satirlar={satirlar}
        cozumler={cozumler}
        onGuncelle={satirGuncelle}
        onSil={satirSil}
        onEkle={satirEkle}
      />

      {/* Canlı net — kaydetmeden önce görünen asıl geri bildirim. */}
      <div className="flex items-baseline justify-between rounded-lg bg-[var(--color-surface-2)] px-4 py-3">
        <span className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          Toplam net
        </span>
        <span
          /* `aria-live`: net sessizce değişen bir sayı olmamalı —
             ekran okuyucu kullanıcısı da hesabın işlediğini duymalı.
             `polite`, her tuş vuruşunda araya girmez. */
          aria-live="polite"
          className="tabular text-[length:var(--text-2xl)] font-semibold text-[var(--color-accent)]"
        >
          {formatNet(net)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          variant="primary"
          disabled={!gecerli}
          loading={pending}
        >
          Denemeyi kaydet
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Vazgeç
          </Button>
        )}
      </div>
    </form>
  );
}

/* ── Ders tablosu ─────────────────────────────────────────────── */

/**
 * Izgara ölçüsü tek yerde: başlık satırı ile veri satırları AYNI
 * şablonu kullanmak ZORUNDA, yoksa sütunlar kayar.
 */
const IZGARA = "grid-cols-[1fr_3.25rem_3.25rem_3.25rem_4rem_2rem]";

interface DersTablosuProps {
  satirlar: DersSatiri[];
  cozumler: CozumlenmisSatir[];
  onGuncelle: (index: number, patch: Partial<DersSatiri>) => void;
  onSil: (index: number) => void;
  onEkle: () => void;
}

function DersTablosu({
  satirlar,
  cozumler,
  onGuncelle,
  onSil,
  onEkle,
}: DersTablosuProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          Dersler
        </span>
        <span className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
          Boş kendiliğinden hesaplanır
        </span>
      </div>

      {/*
       * Sütun başlıkları. Her girdinin kendi `aria-label`'ı da var
       * (aşağıda): başlık satırı görsel hizalama için, etiketler
       * ekran okuyucu için — biri diğerinin yerini tutmaz.
       */}
      <div
        aria-hidden
        className={cn(
          "grid gap-1.5 px-1 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]",
          IZGARA,
        )}
      >
        <span>Ders</span>
        <span className="text-center">D</span>
        <span className="text-center">Y</span>
        <span className="text-center">B</span>
        <span className="text-right">Net</span>
        <span />
      </div>

      {satirlar.map((satir, i) => (
        <DersSatiriInput
          key={i}
          satir={satir}
          cozum={cozumler[i]}
          silinebilir={satirlar.length > 1}
          onGuncelle={(patch) => onGuncelle(i, patch)}
          onSil={() => onSil(i)}
        />
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onEkle}
        className="self-start"
      >
        + Ders ekle
      </Button>
    </div>
  );
}

interface DersSatiriInputProps {
  satir: DersSatiri;
  cozum: CozumlenmisSatir;
  silinebilir: boolean;
  onGuncelle: (patch: Partial<DersSatiri>) => void;
  onSil: () => void;
}

function DersSatiriInput({
  satir,
  cozum,
  silinebilir,
  onGuncelle,
  onSil,
}: DersSatiriInputProps) {
  const bozuk = cozum.durum === "bozuk";
  const net = cozum.deger
    ? hesaplaNet(cozum.deger.dogru, cozum.deger.yanlis)
    : null;
  const dersEtiketi = satir.ders.trim() || "Ders";

  return (
    <div className={cn("grid items-center gap-1.5", IZGARA)}>
      <TextInput
        size="sm"
        aria-label="Ders adı"
        value={satir.ders}
        onChange={(e) => onGuncelle({ ders: e.target.value })}
        invalid={bozuk && satir.ders.trim() === ""}
        placeholder="Ders"
      />

      <TextInput
        size="sm"
        inputMode="numeric"
        aria-label={`${dersEtiketi} doğru sayısı`}
        value={satir.dogru}
        onChange={(e) => onGuncelle({ dogru: e.target.value })}
        invalid={bozuk}
        className="tabular text-center"
      />

      <TextInput
        size="sm"
        inputMode="numeric"
        aria-label={`${dersEtiketi} yanlış sayısı`}
        value={satir.yanlis}
        onChange={(e) => onGuncelle({ yanlis: e.target.value })}
        invalid={bozuk}
        className="tabular text-center"
      />

      {/*
       * Boş SALT OKUNUR ve türetilir. Girilebilir olsaydı üç sayı
       * birbiriyle çelişebilir ve kullanıcı hangisini düzelteceğini
       * bilemezdi. Bu bir kısıtlama değil: soru sayısı düzenlenebilir
       * olduğu için "38 soruluk matematik" de girilebiliyor.
       */}
      <output
        aria-label={`${dersEtiketi} boş sayısı`}
        className={cn(
          "tabular flex h-9 items-center justify-center rounded-md bg-[var(--color-surface-2)] text-[length:var(--text-sm)]",
          bozuk ? "text-[var(--color-danger)]" : "text-[var(--color-ink-3)]",
        )}
      >
        {cozum.bos ?? "—"}
      </output>

      <span className="tabular truncate text-right text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
        {net === null ? "—" : formatNet(net)}
      </span>

      {/*
       * Son satır silinemez: boş bir tabloya düşmek kullanıcıyı
       * "+ Ders ekle"yi bulmak zorunda bırakırdı.
       */}
      {silinebilir ? (
        <button
          type="button"
          onClick={onSil}
          aria-label={`${dersEtiketi} satırını sil`}
          className="grid size-8 place-items-center rounded-md text-[length:var(--text-lg)] leading-none text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-danger)]"
        >
          ×
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}

/* ── Yardımcılar ──────────────────────────────────────────────── */

function sureGecerli(sure: string): boolean {
  const parsed = parseSayi(sure, SURE_DK_MAX);
  // `null` (boş) geçerli: süre tutmamak meşru bir seçim. Yalnızca
  // bozuk girdi ve 0 reddedilir (0018: `between 1 and 400`).
  return parsed !== undefined && (parsed === null || parsed >= 1);
}

function SecimDugmesi({
  secili,
  onClick,
  children,
}: {
  secili: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={secili}
      className={cn(
        "h-9 rounded-lg border px-3.5 text-[length:var(--text-sm)] font-medium",
        "transition-[color,background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out-quart)]",
        "active:scale-[0.97]",
        secili
          ? "border-transparent bg-[var(--color-accent)] text-[var(--color-on-accent)]"
          : "border-[var(--color-line-2)] bg-[var(--color-surface-2)] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
      )}
    >
      {children}
    </button>
  );
}
