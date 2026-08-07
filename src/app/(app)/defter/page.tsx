import { redirect } from "next/navigation";

/**
 * Defterin kendisi bir ekran değildir; ilk bölüme yönlendirir.
 *
 * Notlar varsayılandır çünkü daha eski ve daha genel amaçlıdır.
 */
export default function DefterPage() {
  redirect("/defter/notlar");
}
