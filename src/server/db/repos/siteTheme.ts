import { like } from "drizzle-orm";
import { db } from "../index";
import { settings } from "../schema";
import {
  HEX_RE,
  LOGO_SETTING_KEY,
  THEME_DEFAULTS,
  THEME_SETTING_PREFIX,
  type ThemeKey,
} from "@/lib/site-theme";
import { getSetting } from "./settings";

/** Raw admin color overrides (valid hex only). */
export async function getThemeOverrides(): Promise<
  Partial<Record<ThemeKey, string>>
> {
  const overrides: Partial<Record<ThemeKey, string>> = {};
  try {
    const rows = await db
      .select()
      .from(settings)
      .where(like(settings.key, `${THEME_SETTING_PREFIX}%`));
    for (const row of rows) {
      const key = row.key.slice(THEME_SETTING_PREFIX.length) as ThemeKey;
      if (key in THEME_DEFAULTS && HEX_RE.test(row.value.trim())) {
        overrides[key] = row.value.trim();
      }
    }
  } catch {
    /* DB not reachable (build time) — no overrides */
  }
  return overrides;
}

/** The site logo as a data URI, or null for the default ⚡ bolt. */
export async function getLogo(): Promise<string | null> {
  try {
    const v = await getSetting(LOGO_SETTING_KEY);
    return v?.startsWith("data:image/") ? v : null;
  } catch {
    return null;
  }
}
