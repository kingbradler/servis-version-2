import type { Metadata, Viewport } from "next";
import { DM_Sans, Syne } from "next/font/google";

import { ThemeProvider } from "@/providers/theme-provider";
import { CartProvider } from "@/providers/cart-provider";
import { ToastProvider } from "@/components/ui/toast";
import { env } from "@/config/env";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
  weight: ["700", "800"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F5F1" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0E0E" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: "SERVIS — Marketplace étudiants entrepreneurs",
    template: "%s | SERVIS",
  },
  description:
    "La plateforme e-commerce multi-vendeurs pour les étudiants entrepreneurs de Tanger, Maroc.",
  applicationName: "SERVIS",
  openGraph: {
    type: "website",
    locale: "fr_MA",
    siteName: "SERVIS",
    title: "SERVIS — Marketplace étudiants entrepreneurs",
    description:
      "Achetez et vendez auprès des étudiants entrepreneurs de Tanger.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SERVIS",
    description:
      "Marketplace multi-vendeurs pour étudiants entrepreneurs — Tanger, Maroc.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${dmSans.variable} ${syne.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans antialiased">
        <ThemeProvider>
          <ToastProvider>
            <CartProvider>{children}</CartProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
