import type { Metadata, Viewport } from "next";
import { Gelasio, VT323 } from "next/font/google";
import "./globals.css";

// Gelasio for headings and the wordmark; VT323, a pixel font, for everything else (it matches the
// pixel logo, icons and robot).
const gelasio = Gelasio({ variable: "--font-gelasio", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const vt323 = VT323({ variable: "--font-vt323", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Hamid",
  description: "Management dashboard for Kost Mujair 12",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  // Lets env(safe-area-inset-*) report the notch/home-indicator insets; gutters use them (safe-gutter).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${vt323.variable} ${gelasio.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
