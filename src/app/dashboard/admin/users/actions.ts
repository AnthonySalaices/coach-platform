"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/server/auth/guards";
import { setUserRole } from "@/server/db/repos/users";

const schema = z.object({
  userId: z.string().min(1),
  role: z.enum(["client", "coach", "admin"]),
});

/** Server action: admin-only role change. Re-checks authorization server-side. */
export async function changeRole(formData: FormData): Promise<void> {
  await requireRole("admin"); // defense in depth — never trust the page gate alone
  const { userId, role } = schema.parse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  await setUserRole(userId, role);
  revalidatePath("/dashboard/admin/users");
}
