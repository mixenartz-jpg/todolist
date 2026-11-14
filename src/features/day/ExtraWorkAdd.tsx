"use client";

import { useState, type FormEvent } from "react";
import { TextInput } from "@/components/Field";
import { Button } from "@/components/Button";

/**
 * Öğrencinin kendi eklediği iş. Sona yazılan süre ayrılır
 * ("Paragraf 30dk" → 30 dk), görev koçun listesinde "öğrenci ekledi"
 * etiketiyle görünür ve koçun planındaki görevlere dokunmaz.
 */
export function ExtraWorkAdd({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = title.trim();
    if (!text) return;
    onAdd(text);
    setTitle("");
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <TextInput
        size="sm"
        aria-label="Ek çalışma"
        placeholder="Ek çalışma ekle (ör. Paragraf 30dk)"
        maxLength={200}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Button type="submit" size="sm" variant="secondary" disabled={!title.trim()}>
        Ekle
      </Button>
    </form>
  );
}
