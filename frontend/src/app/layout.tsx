import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Lalezar } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const body = IBM_Plex_Sans_Arabic({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });
const display = Lalezar({ subsets: ["arabic", "latin"], weight: "400", variable: "--font-display" });

export const metadata: Metadata = {
  title: "مصنع الثلج",
  description: "بيع، إنتاج، ديون، وحساب اليوم لمصنع الثلج",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "مصنع الثلج", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F4C4A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${body.variable} ${display.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
