import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["400", "500", "600"],
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Kipper Property Management — Book direct in San Diego",
    template: "%s · Kipper",
  },
  description:
    "Kipper Property Management — an independent San Diego host. Browse our vacation stays, including Casa Pacifica (3BR, sleeps 8, private heated pool), and book direct with no marketplace fees.",
  openGraph: {
    type: "website",
    title: "Kipper Property Management — Book direct in San Diego",
    description:
      "San Diego vacation stays hosted by Kipper — including Casa Pacifica, a private pool retreat. Best rate when you book direct.",
    images: [{ url: "/photos/casa-pacifica-02.jpg", alt: "Casa Pacifica living room" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="bg-paper font-sans text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        <Header />
        <main id="main" className="min-h-[70vh]">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
