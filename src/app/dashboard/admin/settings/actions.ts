"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/server/auth/guards";
import { setSetting, SITE_NAME_KEY } from "@/server/db/repos/settings";

const schema = z.object({ siteName: z.string().min(1).max(60) });

export async function updateSiteName(formData: FormData): Promise<void> {
  await requireRole("admin");
  const { siteName } = schema.parse({ siteName: formData.get("siteName") });
  await setSetting(SITE_NAME_KEY, siteName.trim());
  revalidatePath("/", "layout"); // the brand appears across the whole app
}
