import { count } from "drizzle-orm";
import { db } from "../index";
import { bookings, coachProfiles, services, users } from "../schema";

/** Headline counts for the admin overview. */
export async function adminCounts(): Promise<{
  users: number;
  coaches: number;
  services: number;
  bookings: number;
}> {
  const [u, c, s, b] = await Promise.all([
    db.select({ n: count() }).from(users),
    db.select({ n: count() }).from(coachProfiles),
    db.select({ n: count() }).from(services),
    db.select({ n: count() }).from(bookings),
  ]);
  return { users: u[0]!.n, coaches: c[0]!.n, services: s[0]!.n, bookings: b[0]!.n };
}
