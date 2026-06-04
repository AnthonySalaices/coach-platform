import { auth } from "@/server/auth";
import { HttpError } from "@/lib/http";
import type { Role } from "@/server/db/schema";

export interface AuthedUser {
  id: string;
  role: Role;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

/** 401 unless there's a valid session. Returns the authenticated user. */
export async function requireUser(): Promise<AuthedUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new HttpError(401, "Authentication required.");
  }
  return session.user as AuthedUser;
}

/** 401 if unauthenticated, 403 unless the user holds one of `roles`. */
export async function requireRole(...roles: Role[]): Promise<AuthedUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new HttpError(403, "You don't have permission to do that.");
  }
  return user;
}

/**
 * Authorization for a single booking: admins see everything; a client may only
 * touch their own booking; a coach only the bookings assigned to them. Anything
 * else is a 403 — a user can never read or cancel someone else's booking.
 */
export function assertBookingAccess(
  user: Pick<AuthedUser, "id" | "role">,
  booking: { clientId: string; coachId: string },
): void {
  if (user.role === "admin") return;
  if (user.id === booking.clientId) return;
  if (user.role === "coach" && user.id === booking.coachId) return;
  throw new HttpError(403, "You don't have access to this booking.");
}
