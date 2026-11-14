import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  /*
   * Görsel kalite izin listesi.
   *
   * Next 16'da ZORUNLU: liste verilmezse varsayılan `[75]` olur ve
   * `quality` prop'u sessizce en yakın izinli değere düşer — hiçbir
   * uyarı vermeden. Marka logosu `quality={90}` istiyor (el yazısı
   * çizgileri ince, sıkıştırma bozulması onları soluk gösteriyor);
   * 90 listede olmasaydı 75 olarak servis edilir ve kimse fark etmezdi.
   *
   * Liste DAR tutuldu: her değer ayrı bir önbellek girdisi ve ayrı bir
   * optimizasyon turu demek. 75 varsayılan, 90 logo için.
   */
  images: {
    qualities: [75, 90],
  },

  async redirects() {
    return [
      // Notlar, Yanlışlar ile birlikte "Defter" altına taşındı. Eski
      // yol kalıcı olarak yönlendirilir: yer imleri ve ana ekrana
      // eklenmiş PWA kısayolları kırılmamalı.
      { source: "/notlar", destination: "/defter/notlar", permanent: true },

      /*
       * Koç / öğrenci ayrımı: koç sayfaları `/koc` altına taşındı.
       * Eski adresler (yer imleri, PWA kısayolları) kırılmasın.
       * `permanent: false` — geri alma ihtimaline karşı tarayıcı 308'i
       * önbelleğe almasın. Öğrenci buraya düşerse proxy onu kendi
       * ekranına geri yollar.
       */
      ...["bugun", "planlama", "arsiv", "istatistik", "tablo", "rutinler", "takvim"].flatMap(
        (seg) => [
          { source: `/${seg}`, destination: `/koc/${seg}`, permanent: false },
          { source: `/${seg}/:path*`, destination: `/koc/${seg}/:path*`, permanent: false },
        ],
      ),
    ];
  },
};

export default nextConfig;
