import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Toast } from "@/components/client";
import { Motion } from "@/components/Motion";
import { SITE_URL } from "@/lib/public-env";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Ranime Jemal Agency — AI Automation Marketplace", template: "%s | Ranime Jemal Agency" },
  description: "Discover ready-to-use AI automations and n8n workflows built by creators to help businesses save time, streamline operations, and work smarter.",
  icons: { icon: "/images/rja-favicon.png", apple: "/images/rja-favicon.png" },
  openGraph: { images: ["/images/rja-opengraph.jpg"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Martian+Mono:wght@300;400&family=Montserrat:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <Suspense><Toast /></Suspense>
        <Motion />
      </body>
    </html>
  );
}
