import StructuredData from "@/components/seo/structured-data";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils/cn";
import { Analytics } from "@vercel/analytics/react";
import { Viewport } from "next";
import { Inter } from "next/font/google";
import Footer from "./(footer)/footer";
import Header from "./(header)/header";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Compare NPM Package Downloads & Trends - Package Pulse",
  description:
    "Compare npm package download trends and statistics. Interactive charts for React, Vue, Angular, and thousands of JavaScript packages. Analyze download patterns, growth rates, and popularity metrics.",
  keywords: [
    "compare npm packages",
    "npm download statistics",
    "npm package trends",
    "npm charts",
    "JavaScript package comparison",
    "npm download trends",
    "package analytics",
    "npm stats",
    "download charts",
    "npm package downloads",
    "react vue angular comparison",
    "npm registry statistics",
    "JavaScript library trends",
    "package popularity",
    "dependency comparison",
    "open source analytics",
    "github trends",
  ],
  openGraph: {
    title: "Compare NPM Package Downloads & Trends - Package Pulse",
    description:
      "Compare npm package download trends and statistics. Interactive charts for React, Vue, Angular, and thousands of JavaScript packages. Analyze download patterns, growth rates, and popularity metrics.",
    url: "https://www.package-pulse.com",
    type: "website",
    images: [
      {
        url: "https://www.package-pulse.com/images/share_image.png",
        width: 800,
        height: 600,
        alt: "Package Pulse - Compare NPM Package Downloads & Trends",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Compare NPM Package Downloads & Trends - Package Pulse",
    description:
      "Compare npm package download trends and statistics. Interactive charts for React, Vue, Angular, and thousands of JavaScript packages.",
    images: ["https://www.package-pulse.com/images/share_image.png"],
  },
  icons: {
    icon: [
      { rel: "icon", url: "/favicon-32x32.png", sizes: "32x32" },
      { rel: "icon", url: "/favicon-16x16.png", sizes: "16x16" },
    ],
    appleTouchIcon: { rel: "apple-touch-icon", url: "/apple-touch-icon.png" },
  },
  manifest: "/site.webmanifest",
  msapplication: {
    TileColor: "#c12336",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <StructuredData type="website" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.className,
        )}
      >
        <Providers>
          <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-2 md:px-4 lg:px-8">
            <Header />
            <main className="relative flex grow flex-col">{children}</main>
            <Footer />
          </div>
          <Toaster />
        </Providers>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
