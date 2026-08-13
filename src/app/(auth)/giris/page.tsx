import type { Metadata } from "next";
import { Card } from "@/components/Card";
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
 * ── Neden yoğunluk rampası DEĞİL? ──
 * Eskiden `--color-level-*` kullanılıyordu ve gerekçesi "uygulamada bu
 * renkler tamamlanmayı anlatır, burada da onu ima etsin"di. Monokrom
 * kabukta bu gerekçe çöker: renk artık YALNIZCA veriyi ayırt ettiği
 * yerde yaşıyor ve giriş ekranı hiçbir veri göstermiyor — burası saf
 * dekor. Mavi lekeler siyah-beyaz bir sayfada yabancı duruyordu.
 *
 * Yerine mürekkebin kendi opaklık rampası: aynı kompozisyon, aynı
 * "dolu hücre" fikri, kabuğun dilinde.
 */
const CELLS = [
  // Sol kanat
  { top: 136, left: 102, opacity: 0.14 },
  { top: 238, left: 68, opacity: 0.2 },
  { top: 340, left: 136, opacity: 0.09 },
  { top: 204, left: 170, opacity: 0.05 },
  // Sağ kanat
  { top: 170, left: 578, opacity: 0.16 },
  { top: 272, left: 646, opacity: 0.1 },
  { top: 374, left: 578, opacity: 0.07 },
  { top: 102, left: 510, opacity: 0.05 },
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
              background: `color-mix(in oklch, var(--color-ink) ${cell.opacity * 100}%, transparent)`,
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

        {/* Form arkasındaki ızgara dokusundan ayrılmalı. Zemin #080808'e
            indiği için siyah gölge orada neredeyse hiçbir şey yapmıyor:
            ayrımı KENARLIK bildirir (yüzey doktrini, globals.css).
            Gölge yine de duruyor ama tek başına taşıyıcı değil. */}
        <Card pad="none" className="rounded-2xl p-5">
          <LoginForm />
        </Card>
      </div>
    </main>
  );
}
