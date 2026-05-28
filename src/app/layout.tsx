import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScripLens — Privacy-First Writing Diagnostics & Readability Dashboard",
  description: "A local, offline-first writing analysis tool. Get statistics, sentence length variation (burstiness), vocabulary diversity, and readability signals entirely in your browser.",
  keywords: "writing analysis, readability, offline nlp, burstiness, text statistics, flesch reading ease, gunning fog index, writing metrics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth antialiased dark">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col bg-[#070a13] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200`}>
        {children}
      </body>
    </html>
  );
}
