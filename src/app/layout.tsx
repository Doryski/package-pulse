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
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.className,
        )}
      >
        <div className="flex flex-col min-h-screen px-8">
          <Providers>
            <main className="flex flex-col flex-grow py-8">{children}</main>
            <Footer />
            <Toaster />
          </Providers>
        </div>
      </body>
    </html>
  );
}
