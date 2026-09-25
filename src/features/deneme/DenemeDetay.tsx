"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Screen, ScreenBody, ScreenHeader } from "@/components/Screen";
import { Skeleton } from "@/components/Skeleton";
import { Toast, useToast } from "@/components/Toast";
import { cn } from "@/lib/ui/cn";
import { formatLongDate } from "@/lib/ui/tr";
import { formatNet, formatSure } from "./format";
import { HATA_TURLERI, type HataTuru } from "./hatasepeti";
import { HataSepetiKarti } from "./HataSepetiKarti";
import { hesaplaNet, toplamNet, yanlisBosOrani } from "./net";
import {
  useCreateYanlis,
  useDeleteDeneme,
  useDeleteDenemeDers,
  useDeleteYanlis,
  useUpdateDeneme,
  useUpdateDenemeDers,
  useUpdateYanlis,
} from "./mutations";
import { useDeneme, useDenemeYanlislari } from "./queries";
import { cozumleDuzenleme } from "./satir";
import type { DenemeTur } from "./sinav";
import { DENEME_AD_MAX, type DenemeDers, type DenemeDetayli, type DenemeYanlis } from "./types";
import { YanlisEkleForm } from "./YanlisEkleForm";
import { YanlisGorseli } from "./YanlisGorseli";

const TUR_ADI: Record<DenemeTur, string> = {
  tyt: "TYT",
  ayt: "AYT",
  brans: "Branş",
  ydt: "YDT",
};

/**
 * Deneme detayı — kullanıcının tarif ettiği ekran.
 *
 * Somut istek şuydu: "girdiğim denemenin ismini yazayım büyükçe, o
 * denemeye basınca o denemede yanlış yaptığım soruların
 * fotoğraflarını ekleyebildiğim bir alan ve kaç net yaptığımı
 * yazabileyim."
 *
 * Ekranın düzeni o cümlenin sırasını izliyor: ad (el yazısı, iri) →
 * net (iri, turuncu) → ders kırılımı → yanlış ızgarası.
 */
export function DenemeDetay({ denemeId }: { denemeId: string }) {
  const router = useRouter();
  const toast = useToast();

  const { data: deneme, isPending, error } = useDeneme(denemeId);
  const { data: yanlislar } = useDenemeYanlislari(denemeId);

  const createYanlis = useCreateYanlis(toast.show);
  const deleteYanlis = useDeleteYanlis(toast.show);
  const updateYanlis = useUpdateYanlis(toast.show);
  const updateDeneme = useUpdateDeneme(toast.show);
  const updateDers = useUpdateDenemeDers(toast.show);
  const deleteDers = useDeleteDenemeDers(toast.show);
  const deleteDeneme = useDeleteDeneme(toast.show);

  const [formAcik, setFormAcik] = useState(false);
  const [silinecek, setSilinecek] = useState(false);

  if (error) {
    return (
      <Screen>
        <ScreenHeader title="Deneme bulunamadı" width="2xl" />
        <ScreenBody width="2xl">
          <p className="text-[length:var(--text-base)] text-[var(--color-ink-2)]">
            Bu deneme silinmiş olabilir.{" "}
            <Link
              href="/istatistik/denemeler"
              className="text-[var(--color-accent)] underline"
            >
              Denemelere dön
            </Link>
          </p>
        </ScreenBody>
      </Screen>
    );
  }

  if (isPending || !deneme) {
    return (
      <Screen>
        <ScreenHeader title="Deneme" width="2xl" />
        <ScreenBody width="2xl">
          <Skeleton height={120} />
          <Skeleton height={200} delayIndex={1} />
        </ScreenBody>
      </Screen>
    );
  }

  const net = toplamNet(deneme.dersler);

  return (
    <Screen>
      <ScreenHeader
        /*
         * Başlıkta deneme adı DEĞİL, sabit "Deneme" yazıyor. Ad
         * gövdenin tepesinde el yazısıyla ve iri duruyor; başlıkta
         * tekrar etseydi aynı metin iki kez, iki farklı boyutta
         * görünür ve yapışkan şeritte kırpılırdı.
         */
        title="Deneme"
        width="2xl"
        actions={
          <>
            <Link
              href="/istatistik/denemeler"
              className="rounded-md px-2 py-1 text-[length:var(--text-sm)] text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-accent)]"
            >
              Tüm denemeler
            </Link>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setSilinecek(true)}
            >
              Sil
            </Button>
          </>
        }
      />

      <ScreenBody width="2xl">
        <DenemeBasligi
          deneme={deneme}
          net={net}
          onRename={(ad) =>
            updateDeneme.mutate({ id: deneme.id, patch: { ad } })
          }
        />

        <DersTablosu
          dersler={deneme.dersler}
          onEdit={(ders, patch) =>
            updateDers.mutate({
              id: ders.id,
              denemeId: deneme.id,
              patch,
            })
          }
          onSil={(ders) =>
            deleteDers.mutate({ id: ders.id, denemeId: deneme.id })
          }
        />

        {/*
         * Hata sepeti ders tablosundan SONRA, yanlış ızgarasından
         * ÖNCE: "ne kadar iyiyim" (net, ders kırılımı) → "neyi yanlış
         * yapıyorum" (sepet) → "işte o yanlışlar" (ızgara). Teşhis,
         * kanıtından önce gelir.
         */}
        <HataSepetiKarti yanlislar={yanlislar ?? []} />

        <YanlislarBolumu
          deneme={deneme}
          yanlislar={yanlislar}
          formAcik={formAcik}
          pending={createYanlis.isPending}
          onFormAc={() => setFormAcik(true)}
          onFormKapat={() => setFormAcik(false)}
          onEkle={(draft, image) =>
            createYanlis.mutate(
              { draft, image },
              // Form YALNIZCA başarıda kapanır: hata durumunda
              // kullanıcının seçtiği görsel kaybolmamalı.
              { onSuccess: () => setFormAcik(false) },
            )
          }
          onSil={(yanlis) =>
            deleteYanlis.mutate({
              id: yanlis.id,
              denemeId: deneme.id,
              imagePath: yanlis.imagePath,
            })
          }
          onEtiketle={(yanlis, hataTuru) =>
            updateYanlis.mutate({
              id: yanlis.id,
              denemeId: deneme.id,
              patch: {
                /*
                 * Aynı etikete ikinci tık onu KALDIRIR. Yanlış
                 * etiketlenen bir yanlışı düzeltmenin tek yolu bu;
                 * ayrı bir "temizle" düğmesi beş kovanın yanına
                 * altıncı bir kontrol koyardı.
                 */
                hataTuru: yanlis.hataTuru === hataTuru ? null : hataTuru,
              },
            })
          }
          onError={toast.show}
        />
      </ScreenBody>

      {silinecek && (
        <ConfirmDialog
          title="Deneme silinsin mi?"
          /* Sonucu AÇIKÇA söyler: kullanıcı yalnızca üst satırın
             gideceğini sanmamalı — yanlışları ve fotoğrafları da
             cascade ile siliniyor. */
          description="Denemenin ders satırları ve eklediğin yanlış fotoğrafları da silinir. Bu işlem geri alınamaz."
          confirmLabel="Sil"
          pending={deleteDeneme.isPending}
          onConfirm={() =>
            deleteDeneme.mutate(deneme.id, {
              onSuccess: () => router.push("/istatistik/denemeler"),
            })
          }
          onCancel={() => setSilinecek(false)}
        />
      )}

      <Toast
        message={toast.message}
        variant={toast.variant}
        token={toast.token}
        onDismiss={toast.dismiss}
      />
    </Screen>
  );
}

/* ── Başlık ───────────────────────────────────────────────────── */

function DenemeBasligi({
  deneme,
  net,
  onRename,
}: {
  deneme: DenemeDetayli;
  net: number;
  onRename: (ad: string) => void;
}) {
  return (
    <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
      {/*
       * Deneme adı: EL YAZISI ve iri — kullanıcının somut isteği.
       * `text-balance`: iki satıra taşan uzun adlarda satırlar
       * dengeli bölünür, tek kelimelik bir ikinci satır oluşmaz.
       */}
      <DuzenlenebilirAd ad={deneme.ad} onRename={onRename} />

      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
        <span className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[length:var(--text-xs)] font-medium text-[var(--color-ink-2)]">
          {TUR_ADI[deneme.tur]}
        </span>
        <span className="tabular">{formatLongDate(deneme.tarih)}</span>
        {deneme.sureDk !== null && (
          <>
            <span aria-hidden>·</span>
            <span className="tabular">{formatSure(deneme.sureDk)}</span>
          </>
        )}
      </p>

      {/* Net: ekranın en iri sayısı. Tek vurgu, tek turuncu. */}
      <p className="mt-4 flex items-baseline gap-2">
        <span className="tabular text-[length:var(--text-4xl)] font-semibold leading-none text-[var(--color-accent)]">
          {formatNet(net)}
        </span>
        <span className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
          net
        </span>
      </p>
    </section>
  );
}

/* ── Ders tablosu ─────────────────────────────────────────────── */

/**
 * Aynı anda açık olabilecek TEK hücrenin kimliği.
 *
 * `<ders id>:<alan>` — iki hücre birden açılamasın diye.
 */
type AcikHucre = string | null;

function DersTablosu({
  dersler,
  onEdit,
  onSil,
}: {
  dersler: readonly DenemeDers[];
  onEdit: (
    ders: DenemeDers,
    patch: { dogru: number; yanlis: number; bos: number },
  ) => void;
  onSil: (ders: DenemeDers) => void;
}) {
  /*
   * Aynı satırın iki hücresi AYNI ANDA açılamaz.
   *
   * ── Neden? ──
   * "Doğru"yu düzenlerken kaydetme, kardeş alanı (`yanlış`) props'tan
   * okuyor. İkisi birden açıkken ikisi de kendi render anındaki
   * değeri kapatır ve arka arkaya kaydedilirse ikincisi birincinin
   * yazdığını görmeden üzerine yazabilir. Veritabanının
   * `dogru + yanlis + bos = soru_sayisi` kısıtı bunu yakalar ama
   * kullanıcıya anlaşılmaz bir hata olarak döner.
   *
   * Tek hücre kuralı sorunu KAYNAĞINDA kesiyor. Sıra şöyle işliyor:
   * ikinci hücreye tıklandığında tarayıcı ÖNCE açık input'u blur
   * eder (o da `kaydet`i çağırır ve mutation'ın `onMutate`'i
   * önbelleği anında yamalar), SONRA tıklama işlenir. Yani ikinci
   * hücre açıldığında kardeş değer çoktan tazelenmiş oluyor.
   *
   * `useState` burada, hücrenin içinde DEĞİL: "hangisi açık" sorusu
   * tablonun bilgisi, tek bir hücrenin değil.
   */
  const [acik, setAcik] = useState<AcikHucre>(null);

  if (dersler.length === 0) return null;

  const toplam = dersler.reduce(
    (acc, d) => ({
      dogru: acc.dogru + d.dogru,
      yanlis: acc.yanlis + d.yanlis,
      bos: acc.bos + d.bos,
    }),
    { dogru: 0, yanlis: 0, bos: 0 },
  );

  /*
   * Yanlış/boş oranı — araştırmanın en güçlü teşhis metriği ve
   * tüketici uygulamalarında neredeyse hiç yok. Net "ne kadar
   * iyiyim" der; bu oran "sınavda nasıl davranıyorum" der.
   */
  const oran = yanlisBosOrani(toplam.yanlis, toplam.bos);

  return (
    <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <h3 className="mb-3 text-[length:var(--text-base)] font-medium">
        Ders kırılımı
      </h3>

      <table className="w-full">
        <thead>
          <tr className="text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
            <th scope="col" className="pb-1.5 text-left font-normal">
              Ders
            </th>
            <th scope="col" className="pb-1.5 text-right font-normal">
              D
            </th>
            <th scope="col" className="pb-1.5 text-right font-normal">
              Y
            </th>
            <th scope="col" className="pb-1.5 text-right font-normal">
              B
            </th>
            <th scope="col" className="pb-1.5 text-right font-normal">
              Net
            </th>
            {/* Sil sütunu — başlıksız: ikon zaten kendini anlatıyor
                ve "Sil" yazmak tabloya gürültü katardı. */}
            <th scope="col" className="w-7" />
          </tr>
        </thead>

        <tbody>
          {dersler.map((d) => (
            <tr
              key={d.id}
              className="border-t border-[var(--color-line)] text-[length:var(--text-sm)]"
            >
              <th
                scope="row"
                className="py-2 text-left font-normal text-[var(--color-ink)]"
              >
                {d.ders}
              </th>
              <td className="py-1 text-right">
                <SayiHucresi
                  deger={d.dogru}
                  etiket={`${d.ders} doğru sayısı`}
                  acik={acik === `${d.id}:dogru`}
                  onAc={() => setAcik(`${d.id}:dogru`)}
                  onKapat={() => setAcik(null)}
                  onKaydet={(text) => {
                    const sonuc = cozumleDuzenleme(
                      text,
                      String(d.yanlis),
                      d.soruSayisi,
                    );
                    if (sonuc) onEdit(d, sonuc);
                    return sonuc !== null;
                  }}
                />
              </td>
              <td className="py-1 text-right">
                <SayiHucresi
                  deger={d.yanlis}
                  etiket={`${d.ders} yanlış sayısı`}
                  acik={acik === `${d.id}:yanlis`}
                  onAc={() => setAcik(`${d.id}:yanlis`)}
                  onKapat={() => setAcik(null)}
                  onKaydet={(text) => {
                    const sonuc = cozumleDuzenleme(
                      String(d.dogru),
                      text,
                      d.soruSayisi,
                    );
                    if (sonuc) onEdit(d, sonuc);
                    return sonuc !== null;
                  }}
                />
              </td>
              <td className="tabular py-2 text-right text-[var(--color-ink-3)]">
                {d.bos}
              </td>
              <td className="tabular py-2 text-right font-medium">
                {formatNet(hesaplaNet(d.dogru, d.yanlis))}
              </td>
              <td className="py-2 text-right">
                {/*
                  Ders satırını siler. Onay kutusu YOK: silinen şey üç
                  sayı ve yeniden girmek saniyeler sürüyor — denemenin
                  kendisini silmekten (fotoğraflar da gider) farklı bir
                  ağırlıkta. Onay her yere konduğunda kullanıcı onu
                  okumadan geçmeyi öğrenir.
                */}
                <button
                  type="button"
                  onClick={() => onSil(d)}
                  aria-label={`${d.ders} satırını sil`}
                  className={cn(
                    "grid size-6 place-items-center rounded text-[length:var(--text-sm)] leading-none",
                    "text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)]",
                    "hover:bg-[var(--color-surface-2)] hover:text-[var(--color-danger)]",
                  )}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/*
       * Oran `null` ise (hiç yanlış ve boş yok — kusursuz deneme)
       * satır HİÇ çizilmez. "%0" yazmak, ölçülecek bir davranış
       * yokken kullanıcıyı "aşırı çekingen" ucunda gösterirdi
       * (`yanlisBosOrani`'nın null kararının ekran karşılığı).
       */}
      {oran !== null && (
        <p className="mt-3 border-t border-[var(--color-line)] pt-3 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
          {oranYorumu(oran)}
        </p>
      )}
    </section>
  );
}

/**
 * Yanlış/boş oranının Türkçe karşılığı.
 *
 * Sayı tek başına anlamsız: "%78" hiçbir şey öğretmez. Eşikler
 * araştırmadan: 2/3'ün üstü "emin olmadığında işaretliyorsun",
 * 1/3'ün altı "bildiğini de boş bırakıyorsun".
 */
function oranYorumu(oran: number): string {
  if (oran >= 0.67) {
    return "Yanlışların boşlarından çok — emin olmadığın soruda işaretliyorsun. Bir sonraki denemede şüphelendiğinde boş bırakmayı dene.";
  }
  if (oran <= 0.33) {
    return "Boşların yanlışlarından çok — bildiğin soruları da boş bırakıyor olabilirsin. Emin olduğunda işaretlemekten çekinme.";
  }
  return "Yanlış ve boş dengeli; risk alma biçimin makul görünüyor.";
}

/* ── Yanlışlar ────────────────────────────────────────────────── */

interface YanlislarBolumuProps {
  deneme: DenemeDetayli;
  yanlislar: DenemeYanlis[] | undefined;
  formAcik: boolean;
  pending: boolean;
  onFormAc: () => void;
  onFormKapat: () => void;
  onEkle: React.ComponentProps<typeof YanlisEkleForm>["onSubmit"];
  onSil: (yanlis: DenemeYanlis) => void;
  onEtiketle: (yanlis: DenemeYanlis, hataTuru: HataTuru) => void;
  onError: (message: string) => void;
}

function YanlislarBolumu({
  deneme,
  yanlislar,
  formAcik,
  pending,
  onFormAc,
  onFormKapat,
  onEkle,
  onSil,
  onEtiketle,
  onError,
}: YanlislarBolumuProps) {
  const dersAdlari = deneme.dersler.map((d) => d.ders);

  return (
    <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[length:var(--text-base)] font-medium">
          Yanlışlarım{" "}
          {yanlislar && yanlislar.length > 0 && (
            <span className="tabular text-[var(--color-ink-3)]">
              ({yanlislar.length})
            </span>
          )}
        </h3>

        {!formAcik && (
          <Button variant="secondary" size="sm" onClick={onFormAc}>
            + Fotoğraf
          </Button>
        )}
      </div>

      {formAcik && (
        <div className="mb-4 rounded-lg bg-[var(--color-surface-2)] p-3">
          <YanlisEkleForm
            denemeId={deneme.id}
            dersler={dersAdlari}
            pending={pending}
            onSubmit={onEkle}
            onCancel={onFormKapat}
            onError={onError}
          />
        </div>
      )}

      {!yanlislar || yanlislar.length === 0 ? (
        !formAcik && (
          <p className="py-2 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
            Henüz yanlış eklenmemiş. Soruyu ekran görüntüsü alıp Ctrl+V ile
            yapıştırabilirsin.
          </p>
        )
      ) : (
        /*
         * Izgara: görseller yan yana, dar ekranda tek sütun.
         * `auto-fill` + `minmax`: sütun sayısı genişlikten türer,
         * kırılma noktası elle yazılmaz.
         */
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {yanlislar.map((y) => (
            <li key={y.id}>
              <YanlisKarti
                yanlis={y}
                onSil={() => onSil(y)}
                onEtiketle={(tur) => onEtiketle(y, tur)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function YanlisKarti({
  yanlis,
  onSil,
  onEtiketle,
}: {
  yanlis: DenemeYanlis;
  onSil: () => void;
  onEtiketle: (hataTuru: HataTuru) => void;
}) {
  const baslik = yanlis.soruNo
    ? `${yanlis.ders} · ${yanlis.soruNo}. soru`
    : yanlis.ders;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-[var(--color-surface-2)] p-2">
      {yanlis.imagePath ? (
        <YanlisGorseli
          path={yanlis.imagePath}
          width={yanlis.imageWidth}
          height={yanlis.imageHeight}
          alt={baslik}
        />
      ) : (
        <div
          aria-hidden
          className="grid h-20 place-items-center rounded-md bg-[var(--color-surface-3)] text-[length:var(--text-xs)] text-[var(--color-ink-3)]"
        >
          Görselsiz
        </div>
      )}

      <div className="flex items-start justify-between gap-1">
        <p className="min-w-0 flex-1 text-[length:var(--text-xs)] leading-snug text-[var(--color-ink-2)]">
          {baslik}
        </p>

        <button
          type="button"
          onClick={onSil}
          aria-label={`${baslik} yanlışını sil`}
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded text-[length:var(--text-sm)] leading-none",
            "text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)]",
            "hover:bg-[var(--color-surface-3)] hover:text-[var(--color-danger)]",
          )}
        >
          ×
        </button>
      </div>

      <HataEtiketleri secili={yanlis.hataTuru} onSec={onEtiketle} />
    </div>
  );
}

/**
 * Hata türü etiketleri — beş kova, tek tık.
 *
 * ── Neden açılır liste DEĞİL? ──
 * Etiketleme seri bir iş: kullanıcı on beş yanlışı arka arkaya
 * geçiyor. Açılır liste her biri için aç–seç–kapa demekti; tek tıklık
 * ciplerde aynı iş üçte bir sürede biter. Beş seçenek bir listeyi hak
 * edecek kadar çok değil.
 *
 * Kısaltılmış adlar (`kisa`): kart 160px genişliğinde ve "Bilgi
 * eksiği" tam hâliyle iki satıra sarardı. Tam ad `title` ve
 * `aria-label` ile erişilebilir kalıyor.
 */
function HataEtiketleri({
  secili,
  onSec,
}: {
  secili: HataTuru | null;
  onSec: (hataTuru: HataTuru) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {HATA_TURLERI.map((h) => {
        const aktif = secili === h.tur;

        return (
          <button
            key={h.tur}
            type="button"
            onClick={() => onSec(h.tur)}
            title={h.ad}
            aria-label={h.ad}
            aria-pressed={aktif}
            className={cn(
              "rounded px-1.5 py-0.5 text-[length:var(--text-2xs)] leading-tight",
              "transition-colors duration-[var(--duration-fast)]",
              aktif
                ? "bg-[var(--color-accent-fill)] text-[var(--color-on-accent)]"
                : "bg-[var(--color-surface-3)] text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]",
            )}
          >
            {KISA_AD[h.tur]}
          </button>
        );
      })}
    </div>
  );
}

/** Dar kartta sığan kısaltmalar. Tam ad `title`/`aria-label`'da. */
const KISA_AD: Record<HataTuru, string> = {
  bilgi: "Bilgi",
  islem: "İşlem",
  dikkat: "Dikkat",
  sure: "Süre",
  strateji: "Strateji",
};

/* ── Yerinde düzenleme ────────────────────────────────────────── */

/**
 * Deneme adı — tıklayınca düzenlenir.
 *
 * ── Neden ayrı bir "düzenle" ekranı DEĞİL? ──
 * Bir deneme kaydedildikten sonra değişmesi gereken tek şey genelde
 * yanlış yazılmış bir sayı ya da addır. Bunun için ayrı bir form
 * açmak, kullanıcıyı ekranı terk edip geri dönmeye zorlardı. Yerinde
 * düzenleme aynı işi tek tıkla bitiriyor.
 *
 * Kaydetme `blur` ve `Enter` ile; `Escape` değişikliği ATAR. Üçü de
 * kullanıcının beklediği davranış ve hiçbiri ayrı bir düğme
 * gerektirmiyor.
 */
function DuzenlenebilirAd({
  ad,
  onRename,
}: {
  ad: string;
  onRename: (ad: string) => void;
}) {
  const [duzenleniyor, setDuzenleniyor] = useState(false);
  const [taslak, setTaslak] = useState(ad);
  /* Escape koruması — gerekçe `SayiHucresi`'nde. */
  const iptal = useRef(false);

  function kaydet() {
    if (iptal.current) {
      iptal.current = false;
      return;
    }

    const temiz = taslak.trim();
    setDuzenleniyor(false);

    // Boş ad 0018'in check kısıtını ihlal ederdi; değişmediyse de
    // ağ turu atmaya gerek yok.
    if (temiz === "" || temiz === ad) {
      setTaslak(ad);
      return;
    }
    onRename(temiz);
  }

  if (!duzenleniyor) {
    return (
      <button
        type="button"
        onClick={() => {
          setTaslak(ad);
          setDuzenleniyor(true);
        }}
        aria-label={`Deneme adını düzenle: ${ad}`}
        className={cn(
          "font-hand text-balance block w-full text-left text-[length:var(--text-3xl)] leading-tight",
          "rounded transition-colors duration-[var(--duration-fast)]",
          "hover:text-[var(--color-accent)]",
        )}
      >
        {ad}
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={taslak}
      maxLength={DENEME_AD_MAX}
      onChange={(e) => setTaslak(e.target.value)}
      onBlur={kaydet}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          iptal.current = true;
          setTaslak(ad);
          setDuzenleniyor(false);
        }
      }}
      aria-label="Deneme adı"
      className={cn(
        "font-hand w-full rounded bg-transparent text-[length:var(--text-3xl)] leading-tight",
        "border-b border-[var(--color-accent)] outline-none",
      )}
    />
  );
}

/**
 * Tablo içinde düzenlenebilir sayı hücresi.
 *
 * `onKaydet` geçerliyse `true` döner. Geçersizse hücre DÜZENLEME
 * MODUNDA KALIR ve kırmızıya döner — kapanıp değişikliği sessizce
 * yutmak, kullanıcıya "kaydedildi" yalanı söylerdi.
 */
function SayiHucresi({
  deger,
  etiket,
  acik,
  onAc,
  onKapat,
  onKaydet,
}: {
  deger: number;
  etiket: string;
  /** Açık mı? Karar TABLONUN — aynı anda tek hücre açılabilir. */
  acik: boolean;
  onAc: () => void;
  onKapat: () => void;
  onKaydet: (text: string) => boolean;
}) {
  const [taslak, setTaslak] = useState(String(deger));
  const [hatali, setHatali] = useState(false);

  /*
   * Escape ile iptal edildi mi?
   *
   * ── Neden state DEĞİL ref? ──
   * `blur`, Escape'in tetiklediği render'dan ÖNCE çalışabilir ve o
   * anda `kaydet` bir state güncellemesini henüz görmezdi — iptal
   * edilen değeri yine de yazardı. Ref senkron okunur: bayrak
   * `keydown` içinde set edilir, `blur` aynı turda onu görür.
   *
   * React unmount'ta blur'u çağırmıyor olabilir ama buna GÜVENMEK,
   * davranışı React sürümüne bağlı bir varsayıma bağlamak olurdu.
   * Bayrak doğruluğu koşuldan bağımsız kılıyor.
   */
  const iptal = useRef(false);

  function kaydet() {
    if (iptal.current) {
      iptal.current = false;
      return;
    }

    if (taslak === String(deger)) {
      onKapat();
      setHatali(false);
      return;
    }

    if (onKaydet(taslak)) {
      onKapat();
      setHatali(false);
    } else {
      // Geçersizse hücre AÇIK KALIR ve kırmızıya döner. Kapanıp
      // değişikliği yutmak "kaydedildi" yalanı söylerdi.
      setHatali(true);
    }
  }

  if (!acik) {
    return (
      <button
        type="button"
        onClick={() => {
          setTaslak(String(deger));
          onAc();
        }}
        aria-label={`${etiket}: ${deger}. Düzenlemek için bas.`}
        className={cn(
          "tabular w-10 rounded px-1 py-0.5 text-right text-[var(--color-ink-2)]",
          "transition-colors duration-[var(--duration-fast)]",
          "hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]",
        )}
      >
        {deger}
      </button>
    );
  }

  return (
    <input
      autoFocus
      inputMode="numeric"
      value={taslak}
      onChange={(e) => {
        setTaslak(e.target.value);
        setHatali(false);
      }}
      onBlur={kaydet}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          kaydet();
        }
        if (e.key === "Escape") {
          // Bayrak ÖNCE: ardından gelen `blur` bunu görüp yazmayı
          // atlamalı.
          iptal.current = true;
          setTaslak(String(deger));
          setHatali(false);
          onKapat();
        }
      }}
      aria-label={etiket}
      aria-invalid={hatali || undefined}
      className={cn(
        "tabular w-10 rounded border bg-[var(--color-surface-2)] px-1 py-0.5 text-right outline-none",
        hatali
          ? "border-[var(--color-danger)]"
          : "border-[var(--color-accent)]",
      )}
    />
  );
}
