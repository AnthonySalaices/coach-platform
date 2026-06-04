import { env } from "@/env";
import { getStripe } from "./stripe";

export interface CreateCheckoutInput {
  bookingId: string;
  serviceTitle: string;
  /** Price in minor units (cents). MUST be server-derived, never client-supplied. */
  amount: number;
  currency: string;
  clientEmail?: string;
}

/**
 * Create a Stripe-hosted Checkout session. We never touch card data — the
 * client is redirected to Stripe. `bookingId` is attached to both the session
 * and the resulting PaymentIntent so the webhook can resolve the booking
 * idempotently via `stripe_payment_intent_id`.
 */
export async function createCheckoutSession(
  input: CreateCheckoutInput,
): Promise<{ id: string; url: string }> {
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency,
          unit_amount: input.amount,
          product_data: { name: input.serviceTitle },
        },
      },
    ],
    customer_email: input.clientEmail,
    metadata: { bookingId: input.bookingId },
    payment_intent_data: { metadata: { bookingId: input.bookingId } },
    success_url: `${env.NEXT_PUBLIC_APP_URL}/bookings/${input.bookingId}?status=success`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/bookings/${input.bookingId}?status=cancelled`,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a Checkout URL.");
  }
  return { id: session.id, url: session.url };
}
