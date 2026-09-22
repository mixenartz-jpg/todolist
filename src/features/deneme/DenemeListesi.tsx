"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IstatistikTabs } from "@/app/(app)/istatistik/IstatistikTabs";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Screen, ScreenBody, ScreenHeader } from "@/components/Screen";
import { Skeleton } from "@/components/Skeleton";
import { Toast, useToast } from "@/components/Toast";
import { formatShortDate } from "@/lib/ui/tr";
import { cn } from "@/lib/ui/cn";
import { DenemeForm } from "./DenemeForm";
import { cizilebilirSeriler, netSerisi, seriOzeti } from "./denemetrend";
import { formatNet, formatNetDegisim } from "./format";
import { toplamNet } from "./net";
import { NetTrendChart } from "./NetTrendChart";
import { useCreateDeneme } from "./mutations";
import { useDenemeler } from "./queries";
import type { DenemeTur } from "./sinav";
import type { DenemeDetayli } from "./types";

/**
 * Deneme listesi — "nasıl gidiyorum" sorusunun ana ekranı.
 *
 * ── Neden `/istatistik` altında? ──
 * `AppShell`'in nav kuralı bağlayıcı: beş sekme üst sınır, yeni yüzey
 * sekme EKLEMEZ, var olanın içine girer. Deneme tam olarak "nasıl
 * gidiyorum" sorusudur ve İstatistik o sekme.
 */
export function DenemeListesi() {
  const toast = useToast();
  const { data: denemeler, isPending } = useDenemeler();
  const createDeneme = useCreateDeneme(toast.show);

  const [formAcik, setFormAcik] = useState(false);

  const trend = useMemo(
    () => (denemeler ? netSerisi(denemeler) : null),
    [denemeler],
  );

  const seriler = trend ? cizilebilirSeriler(trend) : [];

  return (
    <Screen>
      <ScreenHeader
        title="Denemeler"
        subtitle={
          denemeler && denemeler.length > 0
            ? `${denemeler.length} deneme`
            : undefined
        }
        width="3xl"
        actions={
          !formAcik && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setFormAcik(true)}
            >
              Yeni deneme
            </Button>
          )
        }
      >
        <IstatistikTabs />
      </ScreenHeader>

      <ScreenBody width="3xl">
        {formAcik && (
          <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <h2 className="mb-4 text-[length:var(--text-base)] font-medium">
              Yeni deneme
            </h2>
            <DenemeForm
              pending={createDeneme.isPending}
              onCancel={() => setFormAcik(false)}
              onSubmit={(draft) =>
                createDeneme.mutate(draft, {
                  /*
                   * Form YALNIZCA başarıda kapanır. Hata durumunda
                   * açık kalması şart: kullanıcının girdiği on beş
                   * sayı kaybolsaydı, tekrar denemek yerine
                   * uygulamayı bırakırdı.
                   */
                  onSuccess: () => setFormAcik(false),
                })
              }
            />
          </section>
        )}

        {isPending ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={84} delayIndex={i} />
            ))}
          </div>
        ) : !denemeler || denemeler.length === 0 ? (
          !formAcik && (
            <EmptyState
              title="Henüz deneme yok"
              description="İlk denemeni gir; netini, ders kırılımını ve zamanla nasıl ilerlediğini burada göreceksin."
            >
              <Button
                variant="primary"
                className="mt-5"
                onClick={() => setFormAcik(true)}
              >
                İlk denemeni ekle
              </Button>
            </EmptyState>
          )
        ) : (
          <>
            {seriler.length > 0 && <NetTrendChart seriler={seriler} />}

            {/*
             * Özet kartları yalnızca ÇİZİLEBİLİR seriler için: tek
             * denemelik bir tür için "ortalama 86, en iyi 86, son 86"
             * üç kez aynı sayıyı yazmak olurdu.
             */}
            {seriler.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {seriler.map((s) => {
                  const ozet = seriOzeti(s.noktalar);
                  if (ozet === null) return null;

                  return (
                    <SeriKarti key={s.tur} ad={s.ad} ozet={ozet} />
                  );
                })}
              </div>
            )}

            <ul className="flex flex-col gap-2">
              {denemeler.map((deneme) => (
                <li key={deneme.id}>
                  <DenemeSatiri deneme={deneme} />
                </li>
              ))}
            </ul>
          </>
        )}
      </ScreenBody>

      <Toast
        message={toast.message}
        variant={toast.variant}
        token={toast.token}
        onDismiss={toast.dismiss}
      />
    </Screen>
  );
}

/* ── Seri özet kartı ──────────────────────────────────────────── */

function SeriKarti({
  ad,
  ozet,
}: {
  ad: string;
  ozet: NonNullable<ReturnType<typeof seriOzeti>>;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          {ad}
        </span>
        {/*
         * Değişim null ise HİÇBİR ŞEY çizilmez — "+0,00" yazmak
         * ölçülmemiş bir şeyi ölçülmüş gibi gösterirdi
         * (`seriOzeti`'nin null kararının ekran karşılığı).
         */}
        {ozet.degisim !== null && (
          <span
            className={cn(
              "tabular text-[length:var(--text-sm)] font-medium",
              ozet.degisim > 0
                ? "text-[var(--color-accent)]"
                : ozet.degisim < 0
                  ? "text-[var(--color-danger)]"
                  : "text-[var(--color-ink-3)]",
            )}
          >
            {formatNetDegisim(ozet.degisim)}
          </span>
        )}
      </div>

      <p className="tabular mt-1 text-[length:var(--text-2xl)] font-semibold">
        {formatNet(ozet.sonNet)}
      </p>

      <p className="tabular mt-1 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
        En iyi {formatNet(ozet.enIyiNet)} · Ortalama{" "}
        {formatNet(ozet.ortalamaNet)}
      </p>
    </div>
  );
}

/* ── Liste satırı ─────────────────────────────────────────────── */

const TUR_ADI: Record<DenemeTur, string> = {
  tyt: "TYT",
  ayt: "AYT",
  brans: "Branş",
  ydt: "YDT",
};

function DenemeSatiri({ deneme }: { deneme: DenemeDetayli }) {
  const net = toplamNet(deneme.dersler);

  return (
    <Link
      href={`/istatistik/denemeler/${deneme.id}`}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4",
        "transition-[border-color,background-color] duration-[var(--duration-fast)] ease-[var(--ease-out-quart)]",
        "hover:border-[var(--color-line-2)] hover:bg-[var(--color-surface-2)]",
      )}
    >
      <div className="min-w-0 flex-1">
        {/*
         * Deneme adı EL YAZISIYLA ve büyükçe — kullanıcının somut
         * isteği ("ismini yazayım büyükçe"). El yazısı burada meşru:
         * bu bir marka anı değil ama kullanıcının kendi koyduğu ad,
         * yani ekranın en kişisel metni. Gövde ve sayılar Inter kalır.
         */}
        <p className="font-hand truncate text-[length:var(--text-xl)] leading-tight">
          {deneme.ad}
        </p>

        <p className="mt-1 flex items-center gap-1.5 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
          <span className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[length:var(--text-2xs)] font-medium text-[var(--color-ink-2)]">
            {TUR_ADI[deneme.tur]}
          </span>
          <span className="tabular">{formatShortDate(deneme.tarih)}</span>
        </p>
      </div>

      <span className="tabular shrink-0 text-[length:var(--text-xl)] font-semibold text-[var(--color-accent)]">
        {formatNet(net)}
      </span>
    </Link>
  );
}
