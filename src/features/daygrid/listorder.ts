import { splitDaySchedule } from "@/features/tasks/schedule";
import type { Task } from "@/features/tasks/types";

/**
 * Liste görünümünün tek düz sırası.
 *
 * ── Neden AYRAÇ yok ama sıra yine de saate göre? ──
 * Liste, ızgaranın "her işi bir saate düşür" dilinden kaçış yolu:
 * ekranda "Saatli" / "Saatsiz" diye iki başlık olsaydı aynı zorlama
 * geri gelirdi — kullanıcı işlerini iki kutudan hangisine ait diye
 * okumak zorunda kalırdı. Tek liste, tek okuma.
 *
 * Ama sıra RASGELE de değil. Göz listeyi yukarıdan aşağı tarıyor ve
 * gün de yukarıdan aşağı akıyor; 14:00'lık işi 09:00'lık işin üstünde
 * görmek o akışı bozar. Daha önemlisi: ızgara ile liste aynı görev
 * kümesini AYNI mantıkla diziyor, böylece mod değiştirmek işleri yer
 * değiştirtmiyor — kullanıcı iki görünüm arasında kaybolmuyor.
 *
 * Saatsizler sona düşer: saati olmayan bir işin gün içinde bir yeri
 * yok, onu 09:00 ile 11:30'un arasına koymak "sabah yapılacak" gibi
 * okunurdu — verilmemiş bir söz.
 *
 * ── Neden `splitDaySchedule`'ın üstüne kurulu? ──
 * O zaten saatlileri `saat → sortOrder → id` ile DETERMİNİSTİK
 * sıralıyor (bkz. tasks/schedule.ts) ve ızgaranın şerit paketlemesi de
 * aynı fonksiyonu kullanıyor. Sıralamayı burada yeniden yazmak, iki
 * görünümün zamanla sessizce ayrışmasına açık kapı bırakırdı.
 *
 * Saatsizler kendi aralarında girdi sırasını korur — `splitDaySchedule`
 * onları yeniden sıralamaz ve sorgu zaten `sort_order` ile geliyor.
 */
export function orderForList(tasks: readonly Task[]): Task[] {
  const { timed, untimed } = splitDaySchedule(tasks);
  return [...timed, ...untimed];
}
