import { redirect } from "next/navigation";
import { resolveIdentity, type Identity, type PageUser } from "@/lib/view-as";
import type { Role } from "@/server/db/schema";

export type { PageUser };

/** Full identity (effective + real + impersonating). Redirects if signed out. */
export async function getIdentity(): Promise<Identity> {
  const identity = await resolveIdentity();
  if (!identity) {
    redirect("/api/auth/signin?callbackUrl=/dashboard");
  }
  return identity;
}

/** The effective user (honors admin "view as"). Redirects if signed out. */
export async function requirePageUser(): Promise<PageUser> {
  return (await getIdentity()).user;
}

/** Effective-role gate; bounces to /dashboard if the role isn't allowed. */
export async function requirePageRole(...roles: Role[]): Promise<PageUser> {
  const { user } = await getIdentity();
  if (!roles.includes(user.role)) {
    redirect("/dashboard");
  }
  return user;
}
