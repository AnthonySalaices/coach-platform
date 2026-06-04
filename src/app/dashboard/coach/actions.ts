"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePageRole } from "@/lib/page-auth";
import { updateCoachBioAndGames } from "@/server/db/repos/coachProfiles";

const schema = z.object({
  bio: z.string().max(1000),
  games: z.string().max(300),
});

/** Save the (effective) coach's bio + games. Works under admin "view as" too. */
export async function updateCoachProfile(formData: FormData): Promise<void> {
  const user = await requirePageRole("coach", "admin");
  const { bio, games } = schema.parse({
    bio: formData.get("bio") ?? "",
    games: formData.get("games") ?? "",
  });
  const gamesArr = games
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
  await updateCoachBioAndGames(user.id, {
    bio: bio.trim() || null,
    games: gamesArr,
  });
  revalidatePath("/dashboard/coach");
}
