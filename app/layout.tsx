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

export const metadata: Metadata = {
  title: "Smart Infrastructure Digital Ecosystem",
  description: "Sistem Monitoring Pengiriman Semen dari Pelabuhan ke Packing Plant",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/logo192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/logo512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "SINCOS",
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