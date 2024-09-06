import Footer from "@/components/footer";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils/cn";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Package Pulse",
  description: "Package Pulse - track the popularity of npm packages over time",
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
          <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-8">
            <main className="flex grow flex-col py-8">{children}</main>
            <Footer />
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
