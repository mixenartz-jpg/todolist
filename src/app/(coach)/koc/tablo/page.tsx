import { MatrixScreen } from "@/features/matrix/MatrixScreen";

/**
 * Rutin × gün matrisi.
 *
 * Eskiden `/` idi ve siteyi açan ilk şey buydu. Ürün koçluğa dönünce
 * açılış "bu ay nasıl gidiyorum" değil "şimdi ne yapmalıyım" sorusunu
 * cevaplamalı; kök artık Bugün'e düşüyor ve tablo kendi adresine
 * taşındı.
 */
export default function TabloPage() {
  return <MatrixScreen />;
}
