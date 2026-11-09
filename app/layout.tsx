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
  title: "AI Artikel",
  description: "Aplikasi manajemen artikel berbasis AI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      {/*
        suppressHydrationWarning diperlukan pada <body> karena ekstensi
        browser (mis. ColorZilla) menyisipkan atribut seperti
        cz-shortcut-listen="true" ke elemen <body>, yang memicu hydration
        mismatch. Prop ini hanya berlaku untuk atribut elemen body itu
        sendiri dan tidak menyembunyikan mismatch nyata di dalam tree.
      */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
