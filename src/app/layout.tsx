import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PwaConnection from "@/components/PwaConnection";
import PreviewBanner from "@/components/PreviewBanner";
import { isPublicPreview } from "@/lib/booking-launch";

// Deliberate local-system fallbacks keep clean builds independent of font CDNs.
const fontVariables = { "--font-display": "Georgia", "--font-sans": "system-ui" } as CSSProperties;

export const viewport: Viewport = { themeColor: "#1C1917", width: "device-width", initialScale: 1, viewportFit: "cover" };

const siteMetadata: Metadata = {
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Kipper" },
  icons: { apple: "/icons/kipper-180.png" },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.RENDER_EXTERNAL_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Kipper Stays — Book direct in San Diego",
    template: "%s · Kipper",
  },
  description:
    "Kipper Stays — a homeowner-stay preview from Kipper, a concierge-AI startup. Explore accommodation details; reservations and payments are not open.",
  openGraph: {
    type: "website",
    title: "Kipper Stays — Book direct in San Diego",
    description:
      "Explore Casa Pacifica in San Diego on Kipper Stays. Reservations and payments are not open.",
    images: [{ url: "/photos/casa-pacifica-02.jpg", alt: "Casa Pacifica living room" }],
  },
};

export function generateMetadata(): Metadata {
  return { ...siteMetadata, ...(isPublicPreview() ? { robots: { index: false, follow: false, noarchive: true, googleBot: { index: false, follow: false, noimageindex: true } } } : {}) };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const preview = isPublicPreview();
  return (
    <html lang="en" style={fontVariables}>
      <body className={`bg-paper font-sans text-ink antialiased ${preview ? "pt-14 [&>header]:top-14 [&_[role=dialog]]:top-14" : ""}`}>
        {preview && <PreviewBanner />}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        <PwaConnection />
        <Header />
        <main id="main" className="min-h-[70vh]">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
