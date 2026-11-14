/** `/koc/konular?ders=Fizik&sinav=AYT&konu=<id>` — kaynak ↔ konu karşılıklı link. */
export function topicHref(subject: string, exam: string | null, topicId?: string): string {
  const q = new URLSearchParams({ ders: subject });
  if (exam) q.set("sinav", exam);
  if (topicId) q.set("konu", topicId);
  return `/koc/konular?${q.toString()}`;
}
