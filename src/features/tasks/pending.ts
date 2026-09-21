/**
 * Optimistic satır sözleşmesi — saf mantık.
 *
 * `useCreateTask` sunucuya yazmadan önce önbelleğe geçici kimlikli bir
 * satır koyar. O satıra yapılacak her yazma var olmayan bir id'ye gider
 * ve sessizce kaybolur; bu yüzden geçici görevler silinemez,
 * işaretlenemez, yeniden adlandırılamaz.
 *
 * ── Neden ayrı dosya? ──
 * Önce `daygrid/drop.ts` içindeydi, sürükle-bırak mantığının yanında.
 * Ama bu kural sürüklemeye ait değil: saat ızgarası kaldırıldığında da
 * geçerli kaldı çünkü optimistic yazmanın kendisi duruyor. Izgarayla
 * birlikte silinseydi `mutations.ts` ve `TaskItem` kırılırdı.
 *
 * Saf fonksiyon olması, bileşene gömülü olsaydı bu depoda hiçbir testin
 * ona ulaşamayacak olmasındandır — yalnızca `.test.ts` çalışıyor,
 * React test kütüphanesi kurulu değil (aynı gerekçe `sections.ts`'in
 * altında yazılı).
 */

/** Optimistic olarak eklenmiş, henüz sunucuda karşılığı olmayan görev. */
const PENDING_PREFIX = "tmp-";

/**
 * Bu görev henüz yazılmadı mı?
 *
 * İki yerden okunur: `mutations.ts` (yazmayı atlamak için) ve
 * `TaskItem` (eylemleri devre dışı bırakmak için).
 */
export function isPendingTask(id: string): boolean {
  return id.startsWith(PENDING_PREFIX);
}

/** Optimistic satır için geçici kimlik üretir. */
export function pendingTaskId(): string {
  return `${PENDING_PREFIX}${crypto.randomUUID()}`;
}
