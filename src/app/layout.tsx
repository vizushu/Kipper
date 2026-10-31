import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PwaConnection from "@/components/PwaConnection";
import PreviewBanner from "@/components/PreviewBanner";
import { isPublicPreview } from "@/lib/booking-launch";

// Deliberate local-system fallbacks keep clean builds independent of font CDNs.
const fontVariables = { "--font-display": "Georgia", "--font-sans": "system-ui" } as CSSProperties;

export const viewport: Viewport = { themeColor: "#344D3C", width: "device-width", initialScale: 1, viewportFit: "cover" };

const siteMetadata: Metadata = {
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Casa Pacifica" },
  icons: { apple: "/icons/casa-pacifica-180.png" },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.RENDER_EXTERNAL_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Casa Pacifica — Book direct in San Diego",
    template: "%s · Casa Pacifica",
  },
  description:
    "Casa Pacifica — a San Diego accommodation preview. Explore accommodation details; reservations and payments are not open.",
  openGraph: {
    type: "website",
    title: "Casa Pacifica — Book direct in San Diego",
    description:
      "Explore Casa Pacifica in San Diego. Reservations and payments are not open.",
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
      <body className={`bg-paper font-sans text-ink antialiased ${preview ? "public-preview pt-7 [&>header]:top-7 [&_[role=dialog]]:top-7" : ""}`}>
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
