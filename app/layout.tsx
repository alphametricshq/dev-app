import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dashboard Pessoal",
  description: "Dashboard de produtividade pessoal — GitHub & Trello",
  other: {
    "google": "notranslate",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`dark ${inter.variable}`} translate="no">
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
