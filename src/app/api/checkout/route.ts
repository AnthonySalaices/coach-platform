import { requireUser } from "@/server/auth/guards";
import { getServiceById } from "@/server/db/repos/services";
import { createCheckoutSession } from "@/server/payments/checkout";
import { checkoutInput } from "@/server/validation/checkout";
import { HttpError, json, toErrorResponse } from "@/lib/http";

// Stripe needs the Node runtime (the helper uses the Stripe SDK).
export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  try {
    const user = await requireUser();
    const { serviceId } = checkoutInput.parse(await req.json());

    // Price/title/currency come from the Service row — authoritative, never
    // from the client. (This is what prevents a tampered amount.)
    const service = await getServiceById(serviceId);
    if (!service || !service.active) {
      throw new HttpError(404, "Service not found.");
    }

    // TODO(booking wiring): create a pending Booking
    // (clientId=user.id, coachId=service.coachId, serviceId, start/end from the
    // scheduling engine) and use its id below. Stubbed id for now so the Stripe
    // path is exercisable end-to-end.
    const bookingId = `stub_${crypto.randomUUID()}`;

    const session = await createCheckoutSession({
      bookingId,
      serviceTitle: service.title,
      amount: service.price,
      currency: service.currency,
      clientEmail: user.email ?? undefined,
    });

    return json({ url: session.url });
  } catch (err) {
    return toErrorResponse(err);
  }
}
