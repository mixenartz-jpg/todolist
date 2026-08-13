import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  // latin-ext Türkçe karakterler için gerekli: ğ, ş, ı, İ, ç, ö, ü
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rutin",
  description: "Günlük rutin ve görev takibi",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Rutin",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  /* `--color-bg` ile aynı değer; `manifest.ts` ile birlikte değişir.
   * `statusBarStyle: "black-translucent"` (yukarıda) ilk kez gerçekten
   * doğru: durum çubuğu artık altındaki cam kabuğun üstünde duruyor. */
  themeColor: "#080808",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
