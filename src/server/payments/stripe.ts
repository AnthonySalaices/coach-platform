import Stripe from "stripe";
import { env } from "@/env";

// Lazy singleton: the SDK is constructed on first use at runtime, NOT at module
// load — otherwise `next build` (which has no secret) would throw. API version
// is pinned (matches the installed SDK) so webhook event shapes stay stable.
let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-05-27.dahlia",
      typescript: true,
    });
  }
  return client;
}
