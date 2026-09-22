"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Task } from "@/features/tasks/types";
import { Toast, useToast } from "@/components/Toast";
import { ZenScreen } from "./ZenScreen";

interface ZenContextValue {
  /** Zen'i bu görevle açar. */
  enter: (task: Task) => void;
  /** Şu an Zen açık mı? Giriş düğmelerini gizlemek için. */
  active: boolean;
}

const ZenContext = createContext<ZenContextValue | null>(null);

/**
 * Zen odak modu — rota DEĞİL, kabuk düzeyinde bir katman.
 *
 * ── Neden rota değil? ──
 * `/zen` olsaydı üç şey bozulurdu: geri düğmesi Zen'i bir "sayfa"
 * yapar ve kullanıcı odaktan yanlışlıkla çıkardı; sayfa yenilenince
 * oturum (ve sayaç) kaybolurdu; ve görev kimliğini URL'de taşımak
 * gerekirdi — silinmiş bir göreve ait bir adres, çıkışı olmayan bir
 * hata ekranı demekti.
 *
 * Katman olarak: Zen açıkken sayfa ALTTA duruyor ve çıkışta kullanıcı
 * bıraktığı yere, bıraktığı kaydırma konumuyla dönüyor.
 *
 * ── Neden context? ──
 * Zen'e iki yerden giriliyor: odak kartı (Bugün) ve hızlı panel (her
 * sayfa). İkisi de ağaçta çok farklı yerlerde ve prop olarak
 * geçirmek, `AppShell`'den aşağı her katmandan bir `onZen` taşımak
 * demekti.
 */
export function ZenProvider({ children }: { children: ReactNode }) {
  const [task, setTask] = useState<Task | null>(null);

  /*
   * Kayıt hatası uyarısı BURADA gösteriliyor, Zen ekranında değil.
   *
   * Çıkış akışı `persist()` ardından hemen `onExit()` çağırıyor ve
   * ekran sökülüyor — ZenScreen içindeki bir toast doğduğu karede
   * ölürdü. Sağlayıcı Zen kapandıktan sonra da ayakta, mesaj burada
   * yaşıyor.
   *
   * Yazma yine de fire-and-forget: uyarı çıkışı ENGELLEMİYOR, yalnızca
   * kullanıcının süresinin kaydedildiğini SANMASINI engelliyor.
   */
  const toast = useToast();

  const enter = useCallback((next: Task) => setTask(next), []);
  const exit = useCallback(() => setTask(null), []);

  const value = useMemo<ZenContextValue>(
    () => ({ enter, active: task !== null }),
    [enter, task],
  );

  return (
    <ZenContext.Provider value={value}>
      {children}
      {task && (
        <ZenScreen task={task} onExit={exit} onSaveError={toast.show} />
      )}
      <Toast
        message={toast.message}
        variant={toast.variant}
        token={toast.token}
        onDismiss={toast.dismiss}
      />
    </ZenContext.Provider>
  );
}

/**
 * Zen'i açmak için.
 *
 * Sağlayıcı yoksa `null` döner, HATA FIRLATMAZ: widget ve odak kartı
 * sağlayıcının dışında da render edilebilmeli (test, Storybook, ya da
 * ileride kabuksuz bir sayfa) ve o durumda Zen düğmesi yalnızca
 * görünmez olur — ekranın tamamen çökmesi orantısız bir ceza olurdu.
 */
export function useZen(): ZenContextValue | null {
  return useContext(ZenContext);
}
