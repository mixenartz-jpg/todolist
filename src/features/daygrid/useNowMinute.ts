"use client";

import { useEffect, useState } from "react";
import { APP_TIMEZONE } from "@/lib/date/types";

/** Çizgi bir dakikadan sık güncellenmez; daha sık olması boş render. */
const TICK_MS = 60_000;

/**
 * "Şimdi", gün başından dakika — uygulama saat diliminde.
 *
 * `enabled` false ise null döner ve zamanlayıcı hiç kurulmaz: geçmiş
 * bir haftaya bakarken dakikada bir yeniden render etmenin anlamı yok.
 *
 * Sunucuda ve ilk boyamada null: sunucunun saatiyle istemcininki
 * farklıysa hydration uyuşmazlığı çıkardı. Çizgi ilk effect'ten sonra
 * belirir — bir kare gecikme, yanlış bir çizgiden iyidir.
 */
export function useNowMinute(enabled: boolean): number | null {
  const [minute, setMinute] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    /*
     * İlk okuma da zamanlayıcıya bırakılır, effect gövdesinde
     * çağrılmaz: gövdede `setState` çağırmak basamaklı render
     * tetikler (react-hooks/set-state-in-effect). Sıfır gecikmeli
     * zamanlayıcı aynı işi bir sonraki tick'te yapar ve çizgi yine
     * ilk boyamadan hemen sonra belirir.
     */
    const first = setTimeout(() => setMinute(currentMinute()), 0);
    const id = setInterval(() => setMinute(currentMinute()), TICK_MS);

    return () => {
      clearTimeout(first);
      clearInterval(id);
      // Devre dışı kalınca çizgi kaybolmalı — temizlikte sıfırlanır.
      setMinute(null);
    };
  }, [enabled]);

  return enabled ? minute : null;
}

/**
 * Duvar saatini dakikaya çevirir.
 *
 * `getHours()` DEĞİL, Intl: uygulamanın tamamı `APP_TIMEZONE` ile
 * çalışıyor ve tarayıcının yerel saati başka bir dilimde olabilir
 * (bkz. lib/date/date.ts — tek `Date` sınırı kuralı).
 */
function currentMinute(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const min = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + min;
}
