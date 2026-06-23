// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/providers";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets:  ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets:  ["latin"],
});

export const metadata: Metadata = {
  title: {
    default:  "IOE Entrance Practice Platform",
    template: "%s | IOE Practice",
  },
  description:
    "Prepare for IOE entrance exams with practice sets, mock tests, analytics, and smart recommendations.",
  keywords: [
    "IOE entrance",
    "IOE preparation",
    "Nepal engineering entrance",
    "practice tests",
    "mock tests",
  ],
  authors: [{ name: "IOE Practice Platform" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-gray-50 min-h-screen`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
