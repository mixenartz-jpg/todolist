import type { MetadataRoute } from "next";

/** PWA manifesti — telefonda ana ekrana eklenebilmesi için. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rutin — Günlük Takip",
    short_name: "Rutin",
    description: "Rutinlerini takip et, istatistiklerini gör",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0d11",
    theme_color: "#0b0d11",
    orientation: "portrait",
    lang: "tr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
