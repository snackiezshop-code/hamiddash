import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

// Space Grotesk for everything: squared grotesk shapes that suit the outlined-card look, with
// tabular figures for rupiah columns.
const space = Space_Grotesk({ variable: "--font-space", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "HamidKost",
  description: "Dasbor pengelolaan Kost Mujair 12",
};

export const viewport: Viewport = {
  themeColor: "#ECE7DD",
  // Lets env(safe-area-inset-*) report the notch/home-indicator insets; gutters use them (safe-gutter).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${space.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
