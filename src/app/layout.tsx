import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils/cn";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Head from "next/head";
import Footer from "./(footer)/footer";
import Header from "./(header)/header";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Package Pulse",
  description:
    "Explore comprehensive statistics for NPM packages. View charts, tables, and subscribe for email updates on package trends and analytics.",
  keywords: [
    "NPM",
    "package stats",
    "JavaScript libraries",
    "dependency trends",
    "open source analytics",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <Head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="msapplication-TileColor" content="#da532c" />
        <meta name="theme-color" content="#ffffff" />
      </Head>
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
      </body>
    </html>
  );
}
