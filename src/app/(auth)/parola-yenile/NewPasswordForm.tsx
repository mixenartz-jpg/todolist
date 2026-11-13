"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { createClient } from "@/lib/supabase/client";

const INPUT =
  "h-11 w-full rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface-2)] pl-3 pr-16 text-[length:var(--text-base)] outline-none transition-colors duration-[var(--duration-fast)] focus:border-[var(--color-line-3)]";

export function NewPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (password !== confirm) {
      setStatus({ kind: "error", message: "Parolalar eşleşmiyor." });
      return;
    }

    setStatus({ kind: "loading" });
    const { error } = await createClient().auth.updateUser({ password });

    if (error) {
      setStatus({ kind: "error", message: translate(error.message) });
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          Yeni parola
        </span>
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-pressed={show}
            className="absolute inset-y-0 right-0 px-3 text-[length:var(--text-sm)] text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-ink-2)]"
          >
            {show ? "Gizle" : "Göster"}
          </button>
        </div>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          Yeni parola (tekrar)
        </span>
        <input
          type={show ? "text" : "password"}
          required
          minLength={8}
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={INPUT}
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

      <Button
        type="submit"
        variant="primary"
        loading={status.kind === "loading"}
        className="mt-1"
      >
        Parolayı kaydet
      </Button>
    </form>
  );
}

function translate(message: string): string {
  if (message.includes("Password should be")) {
    return "Parola en az 8 karakter olmalı.";
  }
  if (message.includes("different from the old")) {
    return "Yeni parola eskisiyle aynı olamaz.";
  }
  if (message.includes("session")) {
    return "Oturum süresi doldu. Giriş sayfasından yeni bir sıfırlama bağlantısı iste.";
  }
  return message;
}
