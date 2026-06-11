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

const schema = z.object({ siteName: z.string().min(1).max(60) });

export async function updateSiteName(formData: FormData): Promise<void> {
  await requireRole("admin");
  const { siteName } = schema.parse({ siteName: formData.get("siteName") });
  await setSetting(SITE_NAME_KEY, siteName.trim());
  revalidatePath("/", "layout"); // the brand appears across the whole app
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
