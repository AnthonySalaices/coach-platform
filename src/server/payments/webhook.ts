import type Stripe from "stripe";
import { db } from "@/server/db";
import { processedStripeEvents } from "@/server/db/schema";
import { confirmBookingPaid, refundBooking } from "./fulfillment";

/**
 * Process a *verified* Stripe event exactly once.
 *
 * Idempotency: inside one transaction we claim the event id in
 * `processed_stripe_events` (`onConflictDoNothing`). If the row already existed
 * the event is a duplicate/replay and we no-op. Because the claim and the side
 * effects share the transaction, a handler failure rolls back the claim too, so
 * Stripe's retry reprocesses cleanly — never a half-applied event. The
 * fulfillment helpers are themselves idempotent as a second line of defense.
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  await db.transaction(async (tx) => {
    const claimed = await tx
      .insert(processedStripeEvents)
      .values({ eventId: event.id, type: event.type })
      .onConflictDoNothing()
      .returning({ eventId: processedStripeEvents.eventId });

    if (claimed.length === 0) return; // already processed

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const bookingId = session.metadata?.bookingId;
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);
        if (bookingId && paymentIntentId && session.payment_status === "paid") {
          await confirmBookingPaid(tx, {
            bookingId,
            paymentIntentId,
            amount: session.amount_total ?? 0,
            currency: session.currency ?? "usd",
          });
        }
        break;
      }

      case "payment_intent.succeeded": {
        const pi = event.data.object;
        const bookingId = pi.metadata?.bookingId;
        if (bookingId) {
          await confirmBookingPaid(tx, {
            bookingId,
            paymentIntentId: pi.id,
            amount: pi.amount_received || pi.amount || 0,
            currency: pi.currency ?? "usd",
          });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : (charge.payment_intent?.id ?? null);
        if (paymentIntentId) {
          await refundBooking(tx, {
            paymentIntentId,
            refundedAmount: charge.amount_refunded,
          });
        }
        break;
      }

      default:
        // Unknown/uninteresting event types are acknowledged without action.
        break;
    }
  });
}
