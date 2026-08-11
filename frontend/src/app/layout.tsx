import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: {
    default: "School Tools",
    template: "%s | School Tools",
  },
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
      </body>
    </html>
  )
}
