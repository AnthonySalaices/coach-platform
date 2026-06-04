import { eq } from "drizzle-orm";
import { db } from "../index";
import { coachProfiles, type CoachProfile } from "../schema";

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
