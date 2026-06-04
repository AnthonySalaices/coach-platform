import { z } from "zod";
import { id } from "./common";

// The client only chooses WHAT to buy. Price, currency and title are read from
// the Service row server-side — never trusted from the request body.
export const checkoutInput = z.object({
  serviceId: id,
  // TODO(scheduling): startAt, etc. once the availability engine exists.
});

export type CheckoutInput = z.infer<typeof checkoutInput>;
