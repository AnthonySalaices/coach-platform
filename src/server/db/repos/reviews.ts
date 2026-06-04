import { avg, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "../index";
import { reviews, users, type Review } from "../schema";

export async function getReviewByBookingId(
  bookingId: string,
): Promise<Review | undefined> {
  const [row] = await db
    .select()
    .from(reviews)
    .where(eq(reviews.bookingId, bookingId))
    .limit(1);
  return row;
}

export async function createReview(input: {
  bookingId: string;
  clientId: string;
  coachId: string;
  rating: number;
  comment?: string | null;
}): Promise<Review> {
  const [row] = await db
    .insert(reviews)
    .values({
      bookingId: input.bookingId,
      clientId: input.clientId,
      coachId: input.coachId,
      rating: input.rating,
      comment: input.comment ?? null,
    })
    .returning();
  return row!;
}

export interface ClientReview {
  bookingId: string;
  rating: number;
  comment: string | null;
  coachName: string | null;
  createdAt: Date;
}

/** A client's reviews (with coach name), newest first. */
export async function listReviewsByClient(
  clientId: string,
): Promise<ClientReview[]> {
  return db
    .select({
      bookingId: reviews.bookingId,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      coachName: users.name,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.coachId, users.id))
    .where(eq(reviews.clientId, clientId))
    .orderBy(desc(reviews.createdAt));
}

export interface CoachRating {
  avg: number;
  count: number;
}

/** Average rating + count per coach, keyed by coachId. */
export async function getCoachRatings(
  coachIds?: string[],
): Promise<Map<string, CoachRating>> {
  const rows = await db
    .select({
      coachId: reviews.coachId,
      avg: avg(reviews.rating),
      count: count(),
    })
    .from(reviews)
    .where(
      coachIds && coachIds.length
        ? inArray(reviews.coachId, coachIds)
        : undefined,
    )
    .groupBy(reviews.coachId);

  const map = new Map<string, CoachRating>();
  for (const r of rows) {
    map.set(r.coachId, { avg: Number(r.avg ?? 0), count: Number(r.count) });
  }
  return map;
}
