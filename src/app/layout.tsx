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
  title: "Package Pulse | Explore NPM Package Trends",
  description:
    "Explore comprehensive statistics for NPM packages. View charts, tables, and subscribe for email updates on NPM trends and analytics.",
  keywords: [
    "NPM trends",
    "NPM package trends",
    "NPM package",
    "package stats",
    "JavaScript libraries",
    "dependency trends",
    "open source analytics",
    "Github stars",
    "Github trends",
  ],
  openGraph: {
    title: "Package Pulse | Explore NPM Package Trends",
    description:
      "Explore comprehensive statistics for NPM packages. View charts, tables, and subscribe for email updates on package trends and analytics.",
    url: "https://www.package-pulse.com",
    type: "website",
    images: [
      {
        url: "https://www.package-pulse.com/images/share_image.png",
        width: 800,
        height: 600,
        alt: "Package Pulse Share Image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Package Pulse | Explore NPM Package Trends",
    description:
      "Explore comprehensive statistics for NPM packages. View charts, tables, and subscribe for email updates on package trends and analytics.",
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
        <Analytics />
      </body>
    </html>
  );
}
