import type { Metadata } from "next";
import { Inter, Roboto_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LyPX",
  description: "LyPX Platform",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${robotoMono.variable} ${plusJakartaSans.variable} h-full`}
    >
      <body className="min-h-full flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
        {/* FOUC prevention: apply stored theme before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=JSON.parse(localStorage.getItem('lypx_last_theme')||'null');if(!t)return;var d=document.documentElement;var dk={"--bg":"#0F0F11","--surface":"#1B1B1F","--surface-raised":"#202024","--border":"#2C2C35","--text":"#FFFFFF","--text-dim":"#8A8A93","--text-faint":"#55555E"};var lk={"--bg":"#FFFFFF","--surface":"#F5F5F7","--surface-raised":"#EBEBEF","--border":"#E0E0E8","--text":"#0A0A0F","--text-dim":"#555560","--text-faint":"#999999"};var tok=t.bg==='light'?lk:dk;for(var k in tok)d.style.setProperty(k,tok[k]);if(t.accent)d.style.setProperty('--accent',t.accent);}catch(e){}})()` }} />
        {children}
      </body>
    </html>
  );
}
