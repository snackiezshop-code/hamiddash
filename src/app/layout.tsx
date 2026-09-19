import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Gelasio, IBM_Plex_Mono, Manrope, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["600", "700", "800"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const dmSerif = DM_Serif_Display({ variable: "--font-dm-serif", subsets: ["latin"], weight: "400" });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500", "600"] });
const gelasio = Gelasio({ variable: "--font-gelasio", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Hamid",
  description: "Management dashboard for Kost Mujair 12",
};

export const viewport: Viewport = {
  themeColor: "#17140f",
  // Lets env(safe-area-inset-*) report the notch/home-indicator insets; gutters use them (safe-gutter).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} ${manrope.variable} ${plexMono.variable} ${dmSerif.variable} ${gelasio.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
