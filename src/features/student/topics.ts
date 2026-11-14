import { normalize } from "@/lib/text/normalize";

/**
 * "Eksik konular" girişi: virgül ya da Enter ile ayrılan etiketler.
 * Boşluklar kırpılır, aynı konu (büyük/küçük harf ve Türkçe karakter
 * duyarsız) iki kez eklenmez, ilk yazılış korunur.
 */
export function addTopics(existing: readonly string[], input: string): string[] {
  const out = [...existing];
  const seen = new Set(existing.map(topicKey));
  for (const raw of input.split(/[,\n;]/)) {
    const topic = raw.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!topic) continue;
    const key = topicKey(topic);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(topic);
  }
  return out;
}

export function topicKey(topic: string): string {
  return normalize(topic.trim().replace(/\s+/g, " "));
}

/**
 * Görev bir soru çözümü mü? Soru alanları her görevde GÖRÜNÜR ama
 * soru görevi değilse kapalı başlar ("Soru sonucu ekle" ile açılır).
 */
const QUESTION_HINTS = ["soru", "test", "coz", "deneme", "paragraf", "banka", "cikmis", "tarama"];

export function looksLikeQuestionTask(title: string): boolean {
  const t = normalize(title);
  return QUESTION_HINTS.some((h) => t.includes(h));
}
