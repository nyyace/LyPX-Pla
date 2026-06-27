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
        {/* FOUC prevention: apply stored theme + font size before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var d=document.documentElement;try{var t=JSON.parse(localStorage.getItem('lypx_last_theme')||'null');if(t){var dk={"--bg-primary":"#0a0a0a","--bg-secondary":"#111111","--text-primary":"#ffffff","--text-secondary":"#8a8a93","--menu-bg":"#1a1a1a","--menu-text":"#ffffff","--bg":"#0a0a0a","--surface":"#1b1b1f","--surface-raised":"#202024","--border":"#2c2c35","--text":"#ffffff","--text-dim":"#8a8a93","--text-faint":"#55555e"};var lk={"--bg-primary":"#ffffff","--bg-secondary":"#f5f5f5","--text-primary":"#0a0a0a","--text-secondary":"#555560","--menu-bg":"#f0f0f0","--menu-text":"#0a0a0a","--bg":"#ffffff","--surface":"#f5f5f7","--surface-raised":"#ebebef","--border":"#e0e0e8","--text":"#0a0a0f","--text-dim":"#555560","--text-faint":"#999999"};var tok=t.bg==='light'?lk:dk;for(var k in tok)d.style.setProperty(k,tok[k]);if(t.accent){d.style.setProperty('--accent',t.accent);d.style.setProperty('--accent-color',t.accent);d.style.setProperty('--primary',t.accent);}}}catch(e){}try{var f=localStorage.getItem('lypx_font_last');var fz={'small':'0.9','medium':'1','large':'1.1'};if(f&&fz[f])d.style.setProperty('--ui-zoom',fz[f]);}catch(e){}})()` }} />
        {children}
      </body>
    </html>
  );
}
