import { like } from "drizzle-orm";
import { db } from "../index";
import { settings } from "../schema";
import {
  COPY_DEFAULTS,
  COPY_SETTING_PREFIX,
  type CopyKey,
  type SiteCopy,
} from "@/lib/site-copy";

/** Raw admin overrides only (for prefilling the settings form). */
export async function getCopyOverrides(): Promise<
  Partial<Record<CopyKey, string>>
> {
  const overrides: Partial<Record<CopyKey, string>> = {};
  const rows = await db
    .select()
    .from(settings)
    .where(like(settings.key, `${COPY_SETTING_PREFIX}%`));
  for (const row of rows) {
    const key = row.key.slice(COPY_SETTING_PREFIX.length) as CopyKey;
    if (key in COPY_DEFAULTS && row.value.trim()) overrides[key] = row.value;
  }
  return overrides;
}

/** Effective site copy: admin overrides merged over the defaults.
 * Resilient to the DB being unavailable (e.g. during `next build`). */
export async function getSiteCopy(): Promise<SiteCopy> {
  const copy: SiteCopy = { ...COPY_DEFAULTS };
  try {
    const overrides = await getCopyOverrides();
    Object.assign(copy, overrides);
  } catch {
    /* DB not reachable (build time) — defaults only */
  }
  return copy;
}
