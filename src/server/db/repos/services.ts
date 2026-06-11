import { and, eq } from "drizzle-orm";
import { db } from "../index";
import { services, type Service } from "../schema";

export async function getServiceById(id: string): Promise<Service | undefined> {
  const [row] = await db
    .select()
    .from(services)
    .where(eq(services.id, id))
    .limit(1);
  return row;
}

/** Any active service — used by the admin Discord demo as a stand-in. */
export async function getAnyActiveService(): Promise<Service | undefined> {
  const [row] = await db
    .select()
    .from(services)
    .where(eq(services.active, true))
    .limit(1);
  return row;
}

export async function listServicesByCoach(
  coachId: string,
  opts: { activeOnly?: boolean } = {},
): Promise<Service[]> {
  const where = opts.activeOnly
    ? and(eq(services.coachId, coachId), eq(services.active, true))
    : eq(services.coachId, coachId);
  return db.select().from(services).where(where);
}
