"use client";

import Link from "next/link";
import { Button } from "@/components/Button";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { HATA_TURLERI } from "./hatasepeti";
import { useIlerletTekrar } from "./mutations";
import { useDenemeTekrarlari } from "./queries";
import { asamaEtiketi } from "./review";
import type { DenemeYanlis } from "./types";

/**
 * Vadesi gelen tekrarlar — Bugün ekranındaki kuyruk.
 *
 * ── Koçluk döngüsünü KAPATAN parça ──
 * Deneme gir → net gör → yanlışları fotoğrafla → tekrar kuyruğuna
 * düşsün. Araştırmanın tespiti netti: uygulamaların çoğu analizi
 * gösterip orada duruyor; koç hissi veren şey analizin PLANA
 * dönüşmesi. Bu kart o dönüşümün olduğu yer — yanlış, kendiliğinden
 * yarının işine dönüşüyor.
 *
 * ── Hiç tekrar yoksa kart HİÇ çizilmez ──
 * "Bugün tekrar yok" diyen bir kutu, her gün ekranda yer kaplayıp
 * hiçbir şey söylemezdi. Boş durum burada YOKLUK'tur.
 */
export function TekrarKuyrugu({
  bugun,
  onError,
}: {
  bugun: DateStr;
  onError: (message: string) => void;
}) {
  const { data: yanlislar } = useDenemeTekrarlari(bugun);
  const ilerlet = useIlerletTekrar(onError);

  if (!yanlislar || yanlislar.length === 0) return null;

  return (
    <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-[length:var(--text-base)] font-medium">
          Tekrar zamanı{" "}
          <span className="tabular text-[var(--color-ink-3)]">
            ({yanlislar.length})
          </span>
        </h2>
        <span className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
          Çözebiliyorsan işaretle
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {yanlislar.map((y) => (
          <li key={y.id}>
            <TekrarSatiri
              yanlis={y}
              pending={ilerlet.isPending}
              onIlerlet={() => ilerlet.mutate({ yanlis: y, bugun })}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TekrarSatiri({
  yanlis,
  pending,
  onIlerlet,
}: {
  yanlis: DenemeYanlis;
  pending: boolean;
  onIlerlet: () => void;
}) {
  const etiket = yanlis.soruNo
    ? `${yanlis.ders} · ${yanlis.soruNo}. soru`
    : yanlis.ders;

  const hata = HATA_TURLERI.find((h) => h.tur === yanlis.hataTuru);

  return (
    <div className="flex items-center gap-2 rounded-lg bg-[var(--color-surface-2)] px-3 py-2">
      <div className="min-w-0 flex-1">
        {/*
         * Satır denemeye BAĞLI: kullanıcı "bu neydi" diye sorduğunda
         * fotoğrafa ulaşabilmeli. Fotoğrafı burada göstermek ise
         * kuyruğu ağırlaştırırdı — on tekrar on imzalı URL isteği
         * demek.
         */}
        <Link
          href={`/istatistik/denemeler/${yanlis.denemeId}`}
          className="block truncate text-[length:var(--text-sm)] text-[var(--color-ink)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-accent)]"
        >
          {etiket}
        </Link>

        <p className="mt-0.5 flex items-center gap-1.5 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
          <span>{asamaEtiketi(yanlis.reviewStage)}</span>
          {yanlis.konu && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{yanlis.konu}</span>
            </>
          )}
          {hata && (
            <>
              <span aria-hidden>·</span>
              <span>{hata.ad}</span>
            </>
          )}
        </p>
      </div>

      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={onIlerlet}
        className={cn("shrink-0")}
      >
        Çözdüm
      </Button>
    </div>
  );
}
