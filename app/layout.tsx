import type { Metadata } from "next";
import { Inter, Unbounded } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
  display: "swap",
});

// Script anti-FOUC: aplica modo dark/light salvo antes do primeiro paint.
// Accent é fixo (Verde Neon) no globals.css — não precisa injetar via JS.
const themeScript = `(function(){try{var m=localStorage.getItem('theme-mode');var r=document.documentElement;if(m==='light'){r.classList.remove('dark');r.classList.add('light');}}catch(e){}})();`;

export const metadata: Metadata = {
  title: "Alphametrics Dev App",
  description: "Ambiente do dev Alphametrics — GitHub Project, pomodoro, journal, SDK.",
  other: {
    google: "notranslate",
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
      className={`dark ${inter.variable} ${unbounded.variable}`}
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
