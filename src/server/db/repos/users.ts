import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../index";
import { users, type Role, type User } from "../schema";

export async function getUserById(id: string): Promise<User | undefined> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row;
}

/** All users, newest first. Admin-only listing. */
export async function listUsers(): Promise<User[]> {
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUserByDiscordId(
  discordId: string,
): Promise<User | undefined> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.discordId, discordId))
    .limit(1);
  return row;
}

export async function setUserRole(id: string, role: Role): Promise<void> {
  await db.update(users).set({ role }).where(eq(users.id, id));
}

/** Backfill the Discord id on first sign-in (no-op if already set). */
export async function setDiscordIdIfMissing(
  id: string,
  discordId: string,
): Promise<void> {
  await db
    .update(users)
    .set({ discordId })
    .where(and(eq(users.id, id), isNull(users.discordId)));
}
