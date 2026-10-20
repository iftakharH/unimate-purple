import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { MotionProvider } from "@/components/motion-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Unimate",
  title: {
    default: "Unimate — East Delta University Student Marketplace",
    template: "%s · Unimate",
  },
  description:
    "Buy and sell within the East Delta University community. Browse listings from campus sellers, chat in real time, and deal safely in BDT.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Unimate",
    title: "Unimate — East Delta University Student Marketplace",
    description:
      "The campus marketplace, done properly. Buy and sell in BDT, chat in real time, meet on campus.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Unimate — East Delta University Student Marketplace",
    description:
      "The campus marketplace, done properly. Buy and sell in BDT, chat in real time, meet on campus.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <MotionProvider>
            {children}
            <Toaster position="top-center" richColors closeButton />
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
