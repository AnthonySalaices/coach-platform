import { cookies } from "next/headers";
import { auth } from "@/server/auth";
import { getUserById } from "@/server/db/repos/users";
import type { Role } from "@/server/db/schema";

// Admin "view as" / impersonation. An admin can preview the app as another user.
// The impersonated id lives in an httpOnly cookie and is ONLY honored when the
// real, authenticated user is an admin — so a forged cookie does nothing for a
// non-admin.

export const VIEW_AS_COOKIE = "view_as";

export interface PageUser {
  id: string;
  role: Role;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface Identity {
  /** Effective user the page should render for (possibly impersonated). */
  user: PageUser;
  /** The actually-authenticated user. */
  real: PageUser;
  impersonating: boolean;
}

export async function resolveIdentity(): Promise<Identity | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const real: PageUser = {
    id: session.user.id,
    role: session.user.role,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };

  // Only admins can impersonate.
  if (real.role !== "admin") {
    return { user: real, real, impersonating: false };
  }

  const targetId = (await cookies()).get(VIEW_AS_COOKIE)?.value;
  if (!targetId || targetId === real.id) {
    return { user: real, real, impersonating: false };
  }

  const target = await getUserById(targetId);
  if (!target) {
    return { user: real, real, impersonating: false };
  }

  return {
    user: {
      id: target.id,
      role: target.role,
      name: target.name,
      email: target.email,
      image: target.image,
    },
    real,
    impersonating: true,
  };
}
