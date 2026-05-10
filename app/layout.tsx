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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme-id');var T={purple:['265 85% 65%','265 85% 70%','265 50% 25%'],blue:['200 90% 60%','200 90% 65%','200 60% 25%'],green:['150 70% 50%','150 70% 55%','150 50% 22%'],pink:['330 85% 65%','330 85% 70%','330 50% 25%'],cyan:['175 75% 55%','175 75% 60%','175 55% 22%'],orange:['22 90% 60%','22 90% 65%','22 60% 25%']};var v=T[t]||T.purple;var r=document.documentElement;r.style.setProperty('--accent',v[0]);r.style.setProperty('--accent-hover',v[1]);r.style.setProperty('--accent-subtle',v[2]);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
