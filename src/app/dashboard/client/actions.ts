"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePageRole } from "@/lib/page-auth";
import { getBookingById } from "@/server/db/repos/bookings";
import { createReview, getReviewByBookingId } from "@/server/db/repos/reviews";

const schema = z.object({
  bookingId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

/**
 * Leave a review for a completed booking. Authorization + invariants are all
 * checked server-side against the booking row — the client only supplies the
 * booking id, rating and comment.
 */
export async function leaveReview(formData: FormData): Promise<void> {
  const user = await requirePageRole("client", "admin");
  const { bookingId, rating, comment } = schema.parse({
    bookingId: formData.get("bookingId"),
    rating: formData.get("rating"),
    comment: formData.get("comment") ?? undefined,
  });

  const booking = await getBookingById(bookingId);
  if (!booking || booking.clientId !== user.id) {
    throw new Error("Booking not found.");
  }
  if (booking.status !== "completed") {
    throw new Error("You can only review completed sessions.");
  }
  if (await getReviewByBookingId(bookingId)) {
    throw new Error("You already reviewed this session.");
  }

  await createReview({
    bookingId,
    clientId: booking.clientId,
    coachId: booking.coachId,
    rating,
    comment: comment?.trim() || null,
  });
  revalidatePath("/dashboard/client");
}
