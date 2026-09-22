"use client";

import { cn } from "@/lib/ui/cn";
import { formatOran } from "./format";
import { hataSepeti, type HataTasiyan } from "./hatasepeti";

/**
 * Hata sepeti — yanlışların TÜRÜNE göre dağılımı ve reçetesi.
 *
 * ── Neden dağılım değil REÇETE öne çıkıyor? ──
 * Bir çubuk grafiği "yanlışlarının %40'ı dikkat hatası" der ve orada
 * durur. Araştırmanın tespiti tam da bu noktadaydı: uygulamaların
 * çoğu analizi gösterip bırakıyor, koç hissi veren şey analizin
 * EYLEME dönüşmesi. Bu yüzden baskın kovanın reçetesi kartın en
 * görünür satırı; dağılım onun altında, dayanağı olarak duruyor.
 */
export function HataSepetiKarti({
  yanlislar,
}: {
  yanlislar: readonly HataTasiyan[];
}) {
  const sepet = hataSepeti(yanlislar);

  // Hiç yanlış yoksa kart HİÇ çizilmez — boş bir dağılım kutusu
  // ekranda yer kaplayıp bir şey söylemezdi.
  if (yanlislar.length === 0) return null;

  return (
    <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-[length:var(--text-base)] font-medium">
          Hata sepeti
        </h3>

        {/*
         * Etiketsizler AYRI sayılıyor ve burada yapılacak iş olarak
         * gösteriliyor: "14 yanlış etiketlenmeyi bekliyor" somut bir
         * çağrı, oranların içine karışsalar dördüncü bir kova gibi
         * davranır ve dağılımı sulandırırlardı.
         */}
        {sepet.etiketsiz > 0 && (
          <span className="tabular text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            {sepet.etiketsiz} etiketsiz
          </span>
        )}
      </div>

      {sepet.etiketli === 0 ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
          Yanlışlarını etiketlersen hangi tür hatanın baskın olduğunu ve ne
          çalışman gerektiğini burada göreceksin.
        </p>
      ) : (
        <>
          {/*
           * Reçete kutusu. Baskın kova yoksa (beraberlik) reçete
           * yerine dengeli olduğu söylenir — iki eşit sinyalden
           * birini keyfî olarak "asıl sorun" ilan etmek veriye
           * dayanmayan bir iddia olurdu (`hataSepeti`'nin null
           * kararının ekran karşılığı).
           */}
          {sepet.baskin ? (
            <div className="mb-3 rounded-lg bg-[var(--color-surface-2)] p-3">
              <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-ink)]">
                En çok: {sepet.baskin.ad}
              </p>
              <p className="mt-1 text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">
                {sepet.baskin.recete}
              </p>
            </div>
          ) : (
            <p className="mb-3 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
              Dağılım dengeli — tek bir hata türü öne çıkmıyor.
            </p>
          )}

          <ul className="flex flex-col gap-1.5">
            {sepet.kovalar
              // Boş kovalar çizilmez: beş satırın üçü "0" olsaydı
              // dolu olanlar gürültünün içinde kaybolurdu.
              .filter((k) => k.adet > 0)
              .map((k) => (
                <li key={k.tur} className="flex items-center gap-2">
                  <span className="w-28 shrink-0 truncate text-[length:var(--text-xs)] text-[var(--color-ink-2)]">
                    {k.ad}
                  </span>

                  {/*
                   * Çubuk: `aria-hidden`, çünkü sayı zaten yanında
                   * yazılı. Ekran okuyucuya iki kez aynı bilgi
                   * verilmez.
                   */}
                  <span
                    aria-hidden
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]"
                  >
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        k.tur === sepet.baskin?.tur
                          ? "bg-[var(--color-accent)]"
                          : "bg-[var(--color-line-3)]",
                      )}
                      style={{ width: `${Math.round(k.oran * 100)}%` }}
                    />
                  </span>

                  <span className="tabular w-16 shrink-0 text-right text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                    {k.adet} · {formatOran(k.oran)}
                  </span>
                </li>
              ))}
          </ul>
        </>
      )}
    </section>
  );
}
