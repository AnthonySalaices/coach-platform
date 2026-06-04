import { and, asc, eq } from "drizzle-orm";
import { db } from "../index";
import { availability, type Availability } from "../schema";

/** A recurring weekly window, stored in `availability.rule`. */
export interface RecurringWindow {
  weekday: number; // 0=Sun … 6=Sat (UTC)
  startMinute: number; // minutes from midnight (UTC)
  endMinute: number;
}

export async function listAvailabilityByCoach(
  coachId: string,
): Promise<Availability[]> {
  return db
    .select()
    .from(availability)
    .where(eq(availability.coachId, coachId))
    .orderBy(asc(availability.createdAt));
}

export async function addRecurringWindow(
  coachId: string,
  window: RecurringWindow,
): Promise<void> {
  await db.insert(availability).values({
    coachId,
    type: "recurring",
    rule: { ...window },
  });
}

export async function addUnavailability(
  coachId: string,
  startsAt: Date,
  endsAt: Date,
): Promise<void> {
  await db.insert(availability).values({
    coachId,
    type: "exception",
    rule: {},
    startsAt,
    endsAt,
  });
}

/** Delete one of the coach's own availability rows (coachId scopes authz). */
export async function deleteAvailability(
  id: string,
  coachId: string,
): Promise<void> {
  await db
    .delete(availability)
    .where(and(eq(availability.id, id), eq(availability.coachId, coachId)));
}
