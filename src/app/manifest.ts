import type { MetadataRoute } from "next";

/** PWA manifesti — telefonda ana ekrana eklenebilmesi için. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kero YKS — Koçluk Paneli",
    short_name: "Kero YKS",
    description: "Plan, hedef, deneme ve yanlış takibi — kendi koçun ol",
    start_url: "/",
    display: "standalone",
    /* `globals.css` → `--color-bg: oklch(0.135 0.008 48)`. Manifest hex
     * ister; ikisi birlikte değişir, yoksa PWA splash eski mavi-siyahta
     * kalır ve uygulama açılışta bir kare yanlış renk gösterir. */
    background_color: "#080808",
    theme_color: "#080808",
    orientation: "portrait",
    lang: "tr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
