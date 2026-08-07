import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  async redirects() {
    return [
      // Notlar, Yanlışlar ile birlikte "Defter" altına taşındı. Eski
      // yol kalıcı olarak yönlendirilir: yer imleri ve ana ekrana
      // eklenmiş PWA kısayolları kırılmamalı.
      { source: "/notlar", destination: "/defter/notlar", permanent: true },
    ];
  },
};

export default nextConfig;
