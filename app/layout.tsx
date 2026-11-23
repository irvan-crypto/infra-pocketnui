import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import PwaSetup from "@/components/PwaSetup";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#1a56db",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
// Meta description halaman (SEO)
const SITE_DESCRIPTION = "Sistem Informasi Monitoring Infrastruktur";
// Deskripsi pada kartu preview saat link dibagikan
const OG_DESCRIPTION =
  "Monitoring aktifitas rilis semen dari pabrik (silo) ke packing plant";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "SIMIRA",
  description: SITE_DESCRIPTION,
  // Preview saat link dibagikan (WhatsApp, Telegram, Facebook, LinkedIn, X)
  openGraph: {
    type: "website",
    siteName: "SIMIRA",
    locale: "id_ID",
    url: "/",
    title: "SIMIRA — Sistem Monitoring Pengiriman Semen",
    description: OG_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SIMIRA — Sistem Informasi Monitoring Infrastruktur",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SIMIRA — Sistem Monitoring Pengiriman Semen",
    description: OG_DESCRIPTION,
    images: ["/og-image.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/logo192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/logo512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "SIMIRA",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Tangkap event install sebelum React hydrate agar prompt tidak hilang */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                window.__deferredInstallPrompt = null;
                window.__pwaInstalled = false;
                window.addEventListener('beforeinstallprompt', function (e) {
                  e.preventDefault();
                  window.__deferredInstallPrompt = e;
                  window.dispatchEvent(new Event('pwa-installable'));
                });
                window.addEventListener('appinstalled', function () {
                  window.__pwaInstalled = true;
                  window.__deferredInstallPrompt = null;
                  window.dispatchEvent(new Event('pwa-installed'));
                });
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <PwaSetup />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}