import type { Metadata } from "next";
import { Chakra_Petch, Saira, Share_Tech_Mono } from "next/font/google";
import { getSiteName } from "@/server/db/repos/settings";
import { getSiteCopy } from "@/server/db/repos/siteCopy";
import { getThemeOverrides } from "@/server/db/repos/siteTheme";
import { THEME_CSS_VARS, type ThemeKey } from "@/lib/site-theme";
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
  const copy = await getSiteCopy();
  return {
    title: { default: name, template: `%s · ${name}` },
    description: copy["meta.description"],
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Admin color overrides land as :root custom-property overrides, layered
  // after globals.css so everything (incl. color-mix derivations) follows.
  const overrides = await getThemeOverrides();
  const themeCss = (Object.entries(overrides) as [ThemeKey, string][])
    .map(([key, value]) => `${THEME_CSS_VARS[key]}: ${value};`)
    .join(" ");

  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>
        {themeCss && <style>{`:root { ${themeCss} }`}</style>}
        {children}
      </body>
    </html>
  );
}
