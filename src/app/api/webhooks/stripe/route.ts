import { env } from "@/env";
import { getStripe } from "@/server/payments/stripe";
import { handleStripeEvent } from "@/server/payments/webhook";

// Node runtime: we need the raw request body and Node crypto for signature
// verification. Never cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing Stripe-Signature header.", { status: 400 });
  }

  // Must verify against the EXACT raw payload — read it as text, not JSON.
  const payload = await req.text();

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error(
      "[stripe] signature verification failed:",
      err instanceof Error ? err.message : err,
    );
    return new Response("Invalid signature.", { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    // 5xx → Stripe retries later (the handler is idempotent, so retries are safe).
    console.error("[stripe] event handling failed:", err);
    return new Response("Event handling failed.", { status: 500 });
  }

  return Response.json({ received: true });
}
