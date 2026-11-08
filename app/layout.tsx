import type { Metadata, Viewport } from "next";
import Sprite from "@/components/Sprite";
import { Toaster } from "@/components/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "AstraBite",
  description: "Sistem operasional UMKM makanan by Astratech: kasir, stok, promo, layar TV, dan asisten AI.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#E23D24",
};

// Pasang tema & latar sebelum halaman tampil biar nggak kedip.
const init = `try{var t=localStorage.getItem('ab-theme');if(t)document.documentElement.dataset.theme=t;var b=localStorage.getItem('ab-bg');document.documentElement.dataset.bg=b||'doodle'}catch(e){document.documentElement.dataset.bg='doodle'}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Unbounded:wght@600;700;800&family=Caveat:wght@700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: init }} />
      </head>
      <body>
        <Sprite />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
