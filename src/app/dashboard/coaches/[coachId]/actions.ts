"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/env";
import { requirePageRole } from "@/lib/page-auth";
import { db } from "@/server/db";
import { getServiceById } from "@/server/db/repos/services";
import { createBooking } from "@/server/db/repos/bookings";
import { createCheckoutSession } from "@/server/payments/checkout";
import { confirmBookingPaid } from "@/server/payments/fulfillment";
import { isSlotAvailable } from "@/server/scheduling/slots";

const schema = z.object({
  serviceId: z.string().min(1),
  startAt: z.string().min(1),
});

/**
 * Book a specific slot. The client supplies a slot's start time, but we
 * re-derive availability server-side and reject anything that isn't a genuine
 * open slot — so a tampered or stale time can't create a booking.
 */
export async function startBooking(formData: FormData): Promise<void> {
  const user = await requirePageRole("client", "admin");
  const { serviceId, startAt } = schema.parse({
    serviceId: formData.get("serviceId"),
    startAt: formData.get("startAt"),
  });

  const service = await getServiceById(serviceId);
  if (!service || !service.active) throw new Error("Service not found.");

  const start = new Date(startAt);
  if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
    throw new Error("Pick a valid future time.");
  }
  if (!(await isSlotAvailable(service.coachId, service.durationMin, start))) {
    throw new Error("That time is no longer available.");
  }
  const end = new Date(start.getTime() + service.durationMin * 60_000);

  const booking = await createBooking({
    clientId: user.id,
    coachId: service.coachId,
    serviceId: service.id,
    startAt: start,
    endAt: end,
    status: "pending",
  });

  // DEV ONLY (never in production): simulate a successful payment.
  if (env.NODE_ENV !== "production" && env.DEV_BYPASS_PAYMENTS) {
    await db.transaction((tx) =>
      confirmBookingPaid(tx, {
        bookingId: booking.id,
        paymentIntentId: `dev_${booking.id}`,
        amount: service.price,
        currency: service.currency,
      }),
    );
    redirect(`/dashboard/bookings/${booking.id}?status=simulated`);
  }

  const session = await createCheckoutSession({
    bookingId: booking.id,
    serviceTitle: service.title,
    amount: service.price,
    currency: service.currency,
    clientEmail: user.email ?? undefined,
  });
  redirect(session.url);
}
