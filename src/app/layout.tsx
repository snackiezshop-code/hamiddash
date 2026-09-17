import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Fira_Code, Fira_Sans } from "next/font/google";
import "./globals.css";

const firaSans = Fira_Sans({ variable: "--font-fira-sans", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const dmSerif = DM_Serif_Display({ variable: "--font-dm-serif", subsets: ["latin"], weight: "400" });
const firaCode = Fira_Code({ variable: "--font-fira-code", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Hamid",
  description: "Management dashboard for Kost Mujair 12",
};

export const viewport: Viewport = {
  themeColor: "#17140f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${firaSans.variable} ${firaCode.variable} ${dmSerif.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
