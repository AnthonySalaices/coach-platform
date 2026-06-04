import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coaching Platform",
  description: "Self-hostable coaching platform for gamers.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
