"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/server/auth/guards";
import {
  deleteSetting,
  setSetting,
  SITE_NAME_KEY,
} from "@/server/db/repos/settings";
import {
  COPY_DEFAULTS,
  COPY_GROUPS,
  COPY_MAX_LENGTH,
  COPY_SETTING_PREFIX,
} from "@/lib/site-copy";
import {
  HEX_RE,
  LOGO_MAX_BYTES,
  LOGO_MIME_TYPES,
  LOGO_SETTING_KEY,
  THEME_DEFAULTS,
  THEME_SETTING_PREFIX,
  type ThemeKey,
} from "@/lib/site-theme";

const schema = z.object({ siteName: z.string().min(1).max(60) });

export async function updateSiteName(formData: FormData): Promise<void> {
  await requireRole("admin");
  const { siteName } = schema.parse({ siteName: formData.get("siteName") });
  await setSetting(SITE_NAME_KEY, siteName.trim());
  revalidatePath("/", "layout"); // the brand appears across the whole app
}

/** Saves the brand colors. A color equal to its default clears the override. */
export async function updateThemeColors(formData: FormData): Promise<void> {
  await requireRole("admin");

  for (const key of Object.keys(THEME_DEFAULTS) as ThemeKey[]) {
    const raw = formData.get(key);
    if (typeof raw !== "string") continue;
    const value = raw.trim().toLowerCase();
    if (!HEX_RE.test(value)) continue;
    const settingKey = `${THEME_SETTING_PREFIX}${key}`;
    if (value === THEME_DEFAULTS[key]) {
      await deleteSetting(settingKey);
    } else {
      await setSetting(settingKey, value);
    }
  }

  revalidatePath("/", "layout");
  redirect("/dashboard/admin/settings?saved=colors#branding");
}

/** Clears every color override, returning the site to the stock theme. */
export async function resetThemeColors(): Promise<void> {
  await requireRole("admin");
  for (const key of Object.keys(THEME_DEFAULTS)) {
    await deleteSetting(`${THEME_SETTING_PREFIX}${key}`);
  }
  revalidatePath("/", "layout");
  redirect("/dashboard/admin/settings?saved=colors-reset#branding");
}

/** Stores an uploaded logo as a data URI in the settings table (small images
 * only — this is a brand mark, not a media library). */
export async function updateLogo(formData: FormData): Promise<void> {
  await requireRole("admin");

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/dashboard/admin/settings?saved=logo-missing#branding");
  }
  if (!LOGO_MIME_TYPES.includes(file.type)) {
    redirect("/dashboard/admin/settings?saved=logo-type#branding");
  }
  if (file.size > LOGO_MAX_BYTES) {
    redirect("/dashboard/admin/settings?saved=logo-size#branding");
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  await setSetting(LOGO_SETTING_KEY, `data:${file.type};base64,${base64}`);

  revalidatePath("/", "layout");
  redirect("/dashboard/admin/settings?saved=logo#branding");
}

/** Back to the default ⚡ bolt. */
export async function removeLogo(): Promise<void> {
  await requireRole("admin");
  await deleteSetting(LOGO_SETTING_KEY);
  revalidatePath("/", "layout");
  redirect("/dashboard/admin/settings?saved=logo-removed#branding");
}

/** Saves one copy group from the settings page. A blank field (or one left
 * equal to the default) clears the override so the default shows through. */
export async function updateSiteCopy(formData: FormData): Promise<void> {
  await requireRole("admin");

  const groupId = String(formData.get("group") ?? "");
  const group = COPY_GROUPS.find((g) => g.id === groupId);
  if (!group) throw new Error(`Unknown copy group: ${groupId}`);

  for (const field of group.fields) {
    const raw = formData.get(field.key);
    if (typeof raw !== "string") continue;
    const value = raw.replace(/\r\n/g, "\n").slice(0, COPY_MAX_LENGTH).trim();
    const settingKey = `${COPY_SETTING_PREFIX}${field.key}`;
    if (!value || value === COPY_DEFAULTS[field.key]) {
      await deleteSetting(settingKey);
    } else {
      await setSetting(settingKey, value);
    }
  }

  revalidatePath("/", "layout"); // copy appears on landing, sign-in & metadata
  redirect(`/dashboard/admin/settings?saved=${groupId}#copy-${groupId}`);
}
