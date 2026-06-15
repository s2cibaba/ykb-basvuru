import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bireysel İhtiyaç Kredisi - Başvuru ve Detaylar | Yapı Kredi",
  description: "Bireysel İhtiyaç Kredisi başvuru formu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
