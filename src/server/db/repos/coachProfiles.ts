import { asc, eq } from "drizzle-orm";
import { db } from "../index";
import { coachProfiles, users, type CoachProfile } from "../schema";

export interface CoachListing {
  userId: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  games: string[];
  defaultCurrency: string;
}

/** Coaches (role=coach with a profile) for the browse page. */
export async function listCoaches(): Promise<CoachListing[]> {
  return db
    .select({
      userId: users.id,
      name: users.name,
      image: users.image,
      bio: coachProfiles.bio,
      games: coachProfiles.games,
      defaultCurrency: coachProfiles.defaultCurrency,
    })
    .from(users)
    .innerJoin(coachProfiles, eq(coachProfiles.userId, users.id))
    .where(eq(users.role, "coach"))
    .orderBy(asc(users.name));
}

export async function getCoachProfileByUserId(
  userId: string,
): Promise<CoachProfile | undefined> {
  const [row] = await db
    .select()
    .from(coachProfiles)
    .where(eq(coachProfiles.userId, userId))
    .limit(1);
  return row;
}

/** Update just bio + games for a coach (creates the profile if missing). Leaves
 * showcase_links / default_currency untouched. */
export async function updateCoachBioAndGames(
  userId: string,
  fields: { bio: string | null; games: string[] },
): Promise<void> {
  await db
    .insert(coachProfiles)
    .values({ userId, bio: fields.bio, games: fields.games })
    .onConflictDoUpdate({
      target: coachProfiles.userId,
      set: { bio: fields.bio, games: fields.games },
    });
}

export async function upsertCoachProfile(input: {
  userId: string;
  bio?: string | null;
  games?: string[];
  showcaseLinks?: string[];
  defaultCurrency?: string;
}): Promise<CoachProfile> {
  const [row] = await db
    .insert(coachProfiles)
    .values({
      userId: input.userId,
      bio: input.bio ?? null,
      games: input.games ?? [],
      showcaseLinks: input.showcaseLinks ?? [],
      defaultCurrency: input.defaultCurrency ?? "usd",
    })
    .onConflictDoUpdate({
      target: coachProfiles.userId,
      set: {
        bio: input.bio ?? null,
        games: input.games ?? [],
        showcaseLinks: input.showcaseLinks ?? [],
        ...(input.defaultCurrency
          ? { defaultCurrency: input.defaultCurrency }
          : {}),
      },
    })
    .returning();
  return row!;
}
