import type { Metadata } from "next";
import { Chakra_Petch, Saira, Share_Tech_Mono } from "next/font/google";
import { getSiteName } from "@/server/db/repos/settings";
import "./globals.css";

const display = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});
const body = Saira({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});
const mono = Share_Tech_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-mono",
});

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
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
