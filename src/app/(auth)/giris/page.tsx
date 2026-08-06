import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import "./login.css";

export const metadata: Metadata = { title: "Giriş · Rutin" };

/*
 * Dolu hücreler: ızgaranın üzerine serpilmiş birkaç işaret.
 *
 * Konumlar elle seçildi ve sabittir — rastgele üretilmez. Rastgelelik
 * her yüklemede farklı bir kompozisyon üretir ve hiçbiri denetlenmiş
 * olmaz; ayrıca sunucu ile istemci farklı sonuç üretip hidrasyon
 * uyuşmazlığı çıkarır.
 *
 * Yoğunluk rampası kullanılır: uygulamanın içinde bu renkler "o gün ne
 * kadar tamamlandı" demektir. Burada da aynı şeyi ima ederler.
 */
const CELLS = [
  // Sol kanat
  { top: 136, left: 102, color: "var(--color-level-2)", opacity: 0.75 },
  { top: 238, left: 68, color: "var(--color-level-1)", opacity: 0.85 },
  { top: 340, left: 136, color: "var(--color-level-1)", opacity: 0.6 },
  { top: 204, left: 170, color: "var(--color-level-3)", opacity: 0.4 },
  // Sağ kanat
  { top: 170, left: 578, color: "var(--color-level-1)", opacity: 0.75 },
  { top: 272, left: 646, color: "var(--color-level-2)", opacity: 0.6 },
  { top: 374, left: 578, color: "var(--color-level-1)", opacity: 0.5 },
  { top: 102, left: 510, color: "var(--color-level-2)", opacity: 0.4 },
];

export default function LoginPage() {
  return (
    <main className="loginRoot flex min-h-dvh items-center justify-center px-6 py-12">
      <div aria-hidden className="loginBackdrop">
        {CELLS.map((cell) => (
          <span
            key={`${cell.top}-${cell.left}`}
            className="loginCell"
            style={{
              top: cell.top,
              left: cell.left,
              background: cell.color,
              opacity: cell.opacity,
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-sm">
        {/* Marka ve form tek bir kompozisyon: ikisi de ortalanır.
            Sola yaslı başlık ortalanmış kartla hizasız duruyordu. */}
        <div className="mb-7 text-center">
          <h1 className="text-[length:var(--text-4xl)] font-semibold leading-none tracking-[-0.025em]">
            Rutin
          </h1>
          <p className="mt-2.5 text-[length:var(--text-base)] text-[var(--color-ink-2)]">
            Günlük takip ve istatistik
          </p>
        </div>

        {/* Form yükseltilmiş bir yüzeyde oturur: arkasındaki dokudan
            ayrılması gerekir. Kenarlık YOK — yükseklik gölge ve üst
            ışıkla bildirilir. */}
        <div className="rounded-2xl bg-[var(--color-surface)] p-5 shadow-[var(--shadow-modal),var(--sheen-top)]">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
