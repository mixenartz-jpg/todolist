import { normalize } from "@/lib/text/normalize";
import type { Exam, Topic } from "@/features/sources/types";

/**
 * Konu adının karşılaştırma anahtarı: Türkçe duyarsız ("Işık" =
 * "ışık" = "ISIK"), noktalama ve fazla boşluk yok sayılır
 * ("EBOB - EKOK" = "Ebob Ekok"). `normalize` içinde
 * `toLocaleLowerCase('tr')` var.
 */
export function topicKey(name: string): string {
  return normalize(name)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Bölüm etiketini ortak konu listesine bağla: ad ya da takma ad tam
 * eşleşmeli (anahtar düzeyinde). Önce aynı ders + sınav aranır; sınav
 * bilinmiyorsa dersin tüm sınavları. Bulunamazsa null → önizlemede
 * "yeni konu".
 */
export function matchTopic(
  label: string,
  topics: readonly Topic[],
  scope: { subject: string | null; exam: Exam | null },
): Topic | null {
  const key = topicKey(label);
  if (!key) return null;
  const subjectKey = scope.subject ? topicKey(scope.subject) : null;
  const candidates = topics.filter(
    (t) =>
      (subjectKey === null || topicKey(t.subject) === subjectKey) &&
      (scope.exam === null || t.exam === scope.exam),
  );
  const hits = (t: Topic) => topicKey(t.name) === key || t.aliases.some((a) => topicKey(a) === key);
  return candidates.find(hits) ?? null;
}
