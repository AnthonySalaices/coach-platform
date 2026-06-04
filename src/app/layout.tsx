import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { getSiteName } from "@/server/db/repos/settings";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export async function generateMetadata(): Promise<Metadata> {
  const name = await getSiteName();
  return {
    title: { default: name, template: `%s · ${name}` },
    description: "Self-hostable coaching for gamers — book top coaches, climb.",
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
