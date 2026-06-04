"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/server/auth";
import { VIEW_AS_COOKIE } from "./view-as";

/** Begin viewing the app as another user. Admin-only (checks the REAL session). */
export async function startViewAs(formData: FormData): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== "admin") return;
  const userId = z.string().min(1).parse(formData.get("userId"));
  (await cookies()).set(VIEW_AS_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  redirect("/dashboard");
}

/** Stop impersonating and return to your own admin view. */
export async function stopViewAs(): Promise<void> {
  (await cookies()).delete(VIEW_AS_COOKIE);
  redirect("/dashboard");
}
