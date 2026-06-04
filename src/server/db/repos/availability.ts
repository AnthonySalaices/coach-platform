import { eq } from "drizzle-orm";
import { db } from "../index";
import { availability, type Availability } from "../schema";

// Scheduling logic lives elsewhere — this repo just reads/writes the flexible
// rule rows. Expand as the scheduling engine is built.
export async function listAvailabilityByCoach(
  coachId: string,
): Promise<Availability[]> {
  return db
    .select()
    .from(availability)
    .where(eq(availability.coachId, coachId));
}
