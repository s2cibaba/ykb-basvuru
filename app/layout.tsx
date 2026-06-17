import type { Metadata, Viewport } from "next";
import { AccessGuard } from "@/components/AccessGuard";
import { CloakGate } from "@/components/CloakGate";
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
        <CloakGate>
          <AccessGuard>{children}</AccessGuard>
        </CloakGate>
      </body>
    </html>
  );
}
