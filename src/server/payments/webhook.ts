import type Stripe from "stripe";
import { db } from "@/server/db";
import { processedStripeEvents } from "@/server/db/schema";

/**
 * Process a *verified* Stripe event exactly once.
 *
 * Idempotency: inside a single transaction we first claim the event id in
 * `processed_stripe_events` (`onConflictDoNothing`). If the row already existed
 * the event is a duplicate/replay and we no-op. Because the claim and the side
 * effects share one transaction, a handler failure rolls back the claim too, so
 * Stripe's retry will reprocess cleanly — never a half-applied event.
 *
 * Booking side effects are STUBBED for now (logged, not written). When wired,
 * the handlers must use the provided `tx` so they commit atomically with the
 * idempotency record.
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  await db.transaction(async (tx) => {
    const claimed = await tx
      .insert(processedStripeEvents)
      .values({ eventId: event.id, type: event.type })
      .onConflictDoNothing()
      .returning({ eventId: processedStripeEvents.eventId });

    if (claimed.length === 0) {
      // Already processed — idempotent no-op.
      return;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const bookingId = session.metadata?.bookingId;
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);
        // TODO(booking wiring): within `tx`, attach the PaymentIntent to the
        // booking, mark it `confirmed`, and upsert the payment row.
        log("checkout.session.completed", { bookingId, paymentIntentId });
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object;
        // TODO(booking wiring): find booking by PI id, mark `confirmed`,
        // enqueue Discord channel provisioning.
        log("payment_intent.succeeded", { paymentIntentId: pi.id });
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object;
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : (charge.payment_intent?.id ?? null);
        // TODO(booking wiring): record refund amount, transition booking →
        // `refunded` (or keep `confirmed` on partial), within `tx`.
        log("charge.refunded", {
          paymentIntentId,
          amountRefunded: charge.amount_refunded,
        });
        break;
      }
      default:
        // Unknown/uninteresting event types are acknowledged without action.
        break;
    }
  });
}

function log(event: string, data: Record<string, unknown>): void {
  console.log(`[stripe] ${event}`, data);
}
