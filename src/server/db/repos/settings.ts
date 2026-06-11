import { eq } from "drizzle-orm";
import { env } from "@/env";
import { db } from "../index";
import { settings } from "../schema";

export const SITE_NAME_KEY = "site_name";

export async function getSetting(key: string): Promise<string | undefined> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  return row?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

export async function deleteSetting(key: string): Promise<void> {
  await db.delete(settings).where(eq(settings.key, key));
}

/** The site/brand name: admin-set value if present, else the env default.
 * Resilient to the DB being unavailable (e.g. during `next build`). */
export async function getSiteName(): Promise<string> {
  try {
    const v = await getSetting(SITE_NAME_KEY);
    if (v?.trim()) return v.trim();
  } catch {
    /* DB not reachable (build time) — fall through to the env default */
  }
  return env.NEXT_PUBLIC_SITE_NAME;
}
