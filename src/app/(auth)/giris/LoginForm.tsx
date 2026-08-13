"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { createClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/supabase/site-url";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "sent" }
  >({ kind: "idle" });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus({ kind: "loading" });

    try {
      const supabase = createClient();

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${getSiteUrl()}/auth/callback` },
        });
        if (error) throw error;
        setStatus({ kind: "sent" });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      router.push("/");
      router.refresh();
    } catch (error) {
      setStatus({ kind: "error", message: translateAuthError(error) });
    }
  }

  if (status.kind === "sent") {
    // İç içe kart YOK: bu zaten giriş kartının içindedir, kendi
    // kenarlığını ve zeminini taşımaz.
    return (
      <div>
        <p className="text-[length:var(--text-base)]">
          <strong className="font-medium">{email}</strong> adresine bir
          doğrulama bağlantısı gönderildi.
        </p>
        <p className="mt-2 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          Bağlantıya tıkladıktan sonra buradan giriş yapabilirsin.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4 -ml-3"
          onClick={() => {
            setMode("signin");
            setStatus({ kind: "idle" });
          }}
        >
          Girişe dön
        </Button>
      </div>
    );
  }

  const isLoading = status.kind === "loading";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          E-posta
        </span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          /* Zemin `surface-2`: alan `surface` üzerindeki bir kartın
             içinde ve aynı renk olsaydı girdi kutusu kaybolurdu.
             Odakta kenar `line-3`'e çıkar — `accent` artık BEYAZ ve
             odaklanan alanın kenarı gözü acıtırdı. */
          className="h-11 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface-2)] px-3 text-[length:var(--text-base)] outline-none transition-colors duration-[var(--duration-fast)] focus:border-[var(--color-line-3)]"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          Parola
        </span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          /* Zemin `surface-2`: alan `surface` üzerindeki bir kartın
             içinde ve aynı renk olsaydı girdi kutusu kaybolurdu.
             Odakta kenar `line-3`'e çıkar — `accent` artık BEYAZ ve
             odaklanan alanın kenarı gözü acıtırdı. */
          className="h-11 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface-2)] px-3 text-[length:var(--text-base)] outline-none transition-colors duration-[var(--duration-fast)] focus:border-[var(--color-line-3)]"
        />
      </label>

      {status.kind === "error" && (
        <p
          role="alert"
          className="text-[length:var(--text-sm)] text-[var(--color-danger)]"
        >
          {status.message}
        </p>
      )}

      <Button type="submit" variant="primary" loading={isLoading} className="mt-1">
        {mode === "signin" ? "Giriş yap" : "Hesap oluştur"}
      </Button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setStatus({ kind: "idle" });
        }}
        className="text-[length:var(--text-sm)] text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-ink-2)]"
      >
        {mode === "signin"
          ? "Hesabın yok mu? Oluştur"
          : "Zaten hesabın var mı? Giriş yap"}
      </button>
    </form>
  );
}

/** Supabase hata mesajlarını Türkçeleştirir. */
function translateAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("Invalid login credentials")) {
    return "E-posta veya parola hatalı.";
  }
  if (message.includes("already registered")) {
    return "Bu e-posta zaten kayıtlı. Giriş yapmayı dene.";
  }
  if (message.includes("Password should be")) {
    return "Parola en az 8 karakter olmalı.";
  }
  if (message.includes("Email not confirmed")) {
    return "E-postanı doğrulaman gerekiyor. Gelen kutunu kontrol et.";
  }
  if (message.includes("NEXT_PUBLIC_SUPABASE")) {
    return "Supabase ayarları eksik. .env.local dosyasını kontrol et.";
  }
  return message;
}
