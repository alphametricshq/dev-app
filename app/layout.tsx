import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { THEMES, DEFAULT_THEME } from "@/lib/theme";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Script anti-FOUC: aplica o tema salvo antes do primeiro paint.
// Gerado a partir de lib/theme.ts (fonte única dos HSL).
const themeVarsJson = JSON.stringify(
  Object.fromEntries(
    Object.values(THEMES).map((t) => [t.id, [t.vars.accent, t.vars.accentHover, t.vars.accentSubtle]]),
  ),
);
const themeScript = `(function(){try{var t=localStorage.getItem('theme-id');var T=${themeVarsJson};var v=T[t]||T[${JSON.stringify(DEFAULT_THEME)}];var r=document.documentElement;r.style.setProperty('--accent',v[0]);r.style.setProperty('--accent-hover',v[1]);r.style.setProperty('--accent-subtle',v[2]);var m=localStorage.getItem('theme-mode');if(m==='light'){r.classList.remove('dark');r.classList.add('light');}}catch(e){}})();`;

export const metadata: Metadata = {
  title: "Dashboard Pessoal",
  description: "Dashboard de produtividade pessoal — GitHub",
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
    <html
      lang="pt-BR"
      className={`dark ${inter.variable}`}
      translate="no"
      suppressHydrationWarning
    >
      <head>
        <meta name="google" content="notranslate" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
