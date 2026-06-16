import type { Metadata, Viewport } from "next";
import { AccessGuard } from "@/components/AccessGuard";
import { ClarityScript } from "@/components/ClarityScript";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bireysel İhtiyaç Kredisi - Başvuru ve Detaylar | Yapı Kredi",
  description: "Bireysel İhtiyaç Kredisi başvuru formu",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>
        <ClarityScript />
        <AccessGuard>{children}</AccessGuard>
      </body>
    </html>
  );
}
