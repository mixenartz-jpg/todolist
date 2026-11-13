import type { Metadata } from "next";
import { BrandMark } from "@/components/BrandMark";
import { Card } from "@/components/Card";
import { NewPasswordForm } from "./NewPasswordForm";
import "../giris/login.css";

export const metadata: Metadata = { title: "Yeni parola · Kero YKS" };

/*
 * Parola sıfırlama bağlantısı /auth/callback'te oturum açar ve buraya
 * yönlendirir. Sayfa PUBLIC_PATHS'te DEĞİL: oturumsuz gelen biri
 * (süresi dolmuş bağlantı, doğrudan adres) middleware'de /giris'e
 * düşer — oturumsuz parola değiştirmek zaten mümkün değil.
 */
export default function NewPasswordPage() {
  return (
    <main className="loginRoot flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <h1 className="leading-none">
            <BrandMark height={96} />
          </h1>
          <p className="mt-4 text-[length:var(--text-base)] text-[var(--color-ink-2)]">
            Yeni parolanı belirle
          </p>
        </div>

        <Card pad="none" className="rounded-2xl p-5">
          <NewPasswordForm />
        </Card>
      </div>
    </main>
  );
}
