import { eq } from "drizzle-orm";
import type { Tx } from "@/server/db";
import { bookings, jobs, payments } from "@/server/db/schema";

/**
 * Mark a booking paid: attach the PaymentIntent, flip pending→confirmed, record
 * the payment, and enqueue Discord channel provisioning. Idempotent — safe to
 * call again for the same booking (webhook retries, duplicate events): it only
 * promotes a `pending` booking and only enqueues the job on that first
 * transition, so retries don't double-provision. Runs inside the caller's
 * transaction so it commits atomically with whatever else is in flight.
 */
export async function confirmBookingPaid(
  tx: Tx,
  params: {
    bookingId: string;
    paymentIntentId: string;
    amount: number;
    currency: string;
  },
): Promise<void> {
  const [booking] = await tx
    .select()
    .from(bookings)
    .where(eq(bookings.id, params.bookingId))
    .limit(1);
  if (!booking) return; // unknown booking id — nothing to fulfill
  if (booking.status === "refunded" || booking.status === "cancelled") return;

  const wasPending = booking.status === "pending";

  await tx
    .update(bookings)
    .set({
      stripePaymentIntentId: params.paymentIntentId,
      status: wasPending ? "confirmed" : booking.status,
    })
    .where(eq(bookings.id, params.bookingId));

  await tx
    .insert(payments)
    .values({
      bookingId: params.bookingId,
      paymentIntentId: params.paymentIntentId,
      amount: params.amount,
      currency: params.currency,
      status: "succeeded",
    })
    .onConflictDoUpdate({
      target: payments.bookingId,
      set: {
        paymentIntentId: params.paymentIntentId,
        amount: params.amount,
        currency: params.currency,
        status: "succeeded",
      },
    });

  if (wasPending) {
    await tx
      .insert(jobs)
      .values({
        type: "discord.provisionChannel",
        payload: { bookingId: params.bookingId },
      });
  }
}

/** Transition a booking to refunded and record the refunded amount. Idempotent. */
export async function refundBooking(
  tx: Tx,
  params: { paymentIntentId: string; refundedAmount: number },
): Promise<void> {
  const [booking] = await tx
    .select()
    .from(bookings)
    .where(eq(bookings.stripePaymentIntentId, params.paymentIntentId))
    .limit(1);
  if (!booking) return;

  await tx
    .update(bookings)
    .set({ status: "refunded" })
    .where(eq(bookings.id, booking.id));
  await tx
    .update(payments)
    .set({ status: "refunded", refundedAmount: params.refundedAmount })
    .where(eq(payments.paymentIntentId, params.paymentIntentId));
}
