import type { Metadata, Viewport } from "next";
import { DM_Sans, Syne } from "next/font/google";

import { ThemeProvider } from "@/providers/theme-provider";
import { CartProvider } from "@/providers/cart-provider";
import { ToastProvider } from "@/components/ui/toast";
import { env } from "@/config/env";
import { ServiceWorkerRegister } from "@/features/pwa/ServiceWorkerRegister";
import { InstallAppPrompt } from "@/features/pwa/InstallAppPrompt";

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
    "Marketplace multi-vendeurs pour acheter et vendre des produits et services près de chez vous, au Maroc.",
  applicationName: "SERVIS",
  openGraph: {
    type: "website",
    locale: "fr_MA",
    siteName: "SERVIS",
    title: "SERVIS — Marketplace étudiants entrepreneurs",
    description:
      "Achetez et vendez des produits et services près de chez vous.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SERVIS",
    description:
      "Marketplace multi-vendeurs pour étudiants entrepreneurs, au Maroc.",
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    title: "SERVIS",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
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
      <body className="flex min-h-full max-w-full flex-col overflow-x-clip font-sans antialiased">
        <ThemeProvider>
          <ToastProvider>
            <CartProvider>
              <ServiceWorkerRegister />
              {children}
              <InstallAppPrompt />
            </CartProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
