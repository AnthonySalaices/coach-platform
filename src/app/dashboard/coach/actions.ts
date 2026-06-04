"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePageRole } from "@/lib/page-auth";
import { updateCoachBioAndGames } from "@/server/db/repos/coachProfiles";
import {
  addRecurringWindow,
  addUnavailability,
  deleteAvailability,
} from "@/server/db/repos/availability";

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

// The client converts the coach's local-time entry into UTC weekday + minutes
// (minutes-from-UTC-midnight; end may exceed 1440 if the window crosses UTC
// midnight). The back-end stays pure UTC.
const recurringSchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  startMinute: z.coerce.number().int().min(0).max(2880),
  endMinute: z.coerce.number().int().min(0).max(2880),
});

export async function addRecurringAvailability(
  formData: FormData,
): Promise<void> {
  const user = await requirePageRole("coach", "admin");
  const { weekday, startMinute, endMinute } = recurringSchema.parse({
    weekday: formData.get("weekday"),
    startMinute: formData.get("startMinute"),
    endMinute: formData.get("endMinute"),
  });
  if (endMinute <= startMinute) throw new Error("End must be after start.");
  await addRecurringWindow(user.id, { weekday, startMinute, endMinute });
  revalidatePath("/dashboard/coach");
}

// `start`/`end` arrive as UTC ISO strings (the client builds them from the
// coach's local date/time selection).
const exceptionSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
});

export async function addUnavailabilityPeriod(
  formData: FormData,
): Promise<void> {
  const user = await requirePageRole("coach", "admin");
  const { start, end } = exceptionSchema.parse({
    start: formData.get("start"),
    end: formData.get("end"),
  });
  const s = new Date(start);
  const e = new Date(end);
  if (e <= s) throw new Error("Pick a valid range.");
  await addUnavailability(user.id, s, e);
  revalidatePath("/dashboard/coach");
}

export async function deleteAvailabilitySlot(formData: FormData): Promise<void> {
  const user = await requirePageRole("coach", "admin");
  const id = z.string().min(1).parse(formData.get("id"));
  await deleteAvailability(id, user.id);
  revalidatePath("/dashboard/coach");
}
