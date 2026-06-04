import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../index";
import {
  bookings,
  services,
  users,
  type Booking,
  type BookingStatus,
  type NewBooking,
} from "../schema";

export interface BookingDetail {
  id: string;
  status: BookingStatus;
  startAt: Date;
  endAt: Date;
  clientName: string | null;
  coachName: string | null;
  serviceTitle: string;
  price: number;
  currency: string;
}

/**
 * Bookings enriched with client/coach/service names for display. Filter by
 * client or coach for the respective dashboards; omit both for the admin view.
 */
export async function listBookingsDetailed(
  opts: { clientId?: string; coachId?: string } = {},
): Promise<BookingDetail[]> {
  const clientU = alias(users, "client_u");
  const coachU = alias(users, "coach_u");

  const filters = [];
  if (opts.clientId) filters.push(eq(bookings.clientId, opts.clientId));
  if (opts.coachId) filters.push(eq(bookings.coachId, opts.coachId));

  return db
    .select({
      id: bookings.id,
      status: bookings.status,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      clientName: clientU.name,
      coachName: coachU.name,
      serviceTitle: services.title,
      price: services.price,
      currency: services.currency,
    })
    .from(bookings)
    .innerJoin(clientU, eq(bookings.clientId, clientU.id))
    .innerJoin(coachU, eq(bookings.coachId, coachU.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(bookings.startAt));
}

export async function getBookingById(id: string): Promise<Booking | undefined> {
  const [row] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, id))
    .limit(1);
  return row;
}

/** The webhook's idempotent join: locate the booking a Stripe event refers to. */
export async function getBookingByPaymentIntentId(
  paymentIntentId: string,
): Promise<Booking | undefined> {
  const [row] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.stripePaymentIntentId, paymentIntentId))
    .limit(1);
  return row;
}

export async function createBooking(input: NewBooking): Promise<Booking> {
  const [row] = await db.insert(bookings).values(input).returning();
  return row!;
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<void> {
  await db.update(bookings).set({ status }).where(eq(bookings.id, id));
}

export async function attachPaymentIntent(
  id: string,
  stripePaymentIntentId: string,
): Promise<void> {
  await db
    .update(bookings)
    .set({ stripePaymentIntentId })
    .where(eq(bookings.id, id));
}

export async function setBookingDiscordChannel(
  id: string,
  discordChannelId: string,
): Promise<void> {
  await db
    .update(bookings)
    .set({ discordChannelId })
    .where(eq(bookings.id, id));
}
