import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Giriş · Rutin" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <h1 className="text-[length:var(--text-3xl)] font-semibold tracking-[-0.02em]">
            Rutin
          </h1>
          <p className="mt-1.5 text-[length:var(--text-base)] text-[var(--color-ink-2)]">
            Günlük takip ve istatistik
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
