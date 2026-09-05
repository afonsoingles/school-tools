import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: {
    default: "School Tools",
    template: "%s · School Tools",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "School Tools",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout ({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${geistSans.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased min-h-svh bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
